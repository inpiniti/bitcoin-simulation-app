"""
HuggingFace Spaces 배포 스크립트
Usage:
  python deploy-to-hf.py --token hf_xxx
  python deploy-to-hf.py  # HF_TOKEN 환경변수 사용
"""
import os
import sys
import ssl
import argparse
import warnings
from pathlib import Path

# 회사/VPN 환경의 self-signed 인증서 우회
warnings.filterwarnings("ignore")
ssl._create_default_https_context = ssl._create_unverified_context
os.environ["CURL_CA_BUNDLE"] = ""
os.environ["REQUESTS_CA_BUNDLE"] = ""

try:
    import httpx

    _orig_client_init = httpx.Client.__init__
    _orig_async_init = httpx.AsyncClient.__init__

    def _client_no_verify(self, *args, **kwargs):
        kwargs["verify"] = False
        _orig_client_init(self, *args, **kwargs)

    def _async_no_verify(self, *args, **kwargs):
        kwargs["verify"] = False
        _orig_async_init(self, *args, **kwargs)

    httpx.Client.__init__ = _client_no_verify
    httpx.AsyncClient.__init__ = _async_no_verify

    from huggingface_hub import HfApi
except ImportError:
    print("huggingface_hub 미설치. 실행: pip install 'huggingface_hub[cli]'")
    sys.exit(1)

REPO_ID = "younginpiniti/bitcoin-simulation-app"
REPO_TYPE = "space"

# 업로드할 파일/디렉토리
INCLUDE_PATHS = [
    "dist",          # 로컬 빌드 결과물 (가장 중요)
    "Dockerfile",
    "nginx.conf",
    ".dockerignore",
    "README.md",
]

IGNORE_PATTERNS = [
    "node_modules",
    ".git",
    ".env",
    ".agents",
    ".claude",
]


def should_ignore(path: Path) -> bool:
    for pattern in path.parts:
        if pattern in IGNORE_PATTERNS:
            return True
    return False


def collect_files(base_dir: Path) -> list:
    files = []
    for include in INCLUDE_PATHS:
        full_path = base_dir / include
        if not full_path.exists():
            print(f"  skip (not found): {include}")
            continue
        if full_path.is_file():
            files.append((full_path, include))
        elif full_path.is_dir():
            for file in full_path.rglob("*"):
                if file.is_file():
                    rel = file.relative_to(base_dir)
                    if not should_ignore(rel):
                        files.append((file, str(rel).replace("\\", "/")))
    return files


def main():
    parser = argparse.ArgumentParser(description="HuggingFace Spaces 배포")
    parser.add_argument("--token", help="HuggingFace access token")
    parser.add_argument("--dry-run", action="store_true", help="파일 목록만 출력")
    args = parser.parse_args()

    token = args.token or os.environ.get("HF_TOKEN")
    if not token and not args.dry_run:
        print("토큰 필요: --token hf_xxx 또는 HF_TOKEN 환경변수")
        sys.exit(1)

    base_dir = Path(__file__).parent
    files = collect_files(base_dir)

    print(f"\nUpload target: {len(files)} files -> {REPO_ID}")
    for _, repo_path in files[:10]:
        print(f"  {repo_path}")
    if len(files) > 10:
        print(f"  ... and {len(files) - 10} more")

    if args.dry_run:
        return

    print("\nUploading...")
    api = HfApi(token=token)

    for local_path, repo_path in files:
        try:
            api.upload_file(
                path_or_fileobj=str(local_path),
                path_in_repo=repo_path,
                repo_id=REPO_ID,
                repo_type=REPO_TYPE,
            )
            print(f"  [OK] {repo_path}")
        except Exception as e:
            print(f"  [FAIL] {repo_path}: {e}")

    print(f"\nDone! https://huggingface.co/spaces/{REPO_ID}")


if __name__ == "__main__":
    main()
