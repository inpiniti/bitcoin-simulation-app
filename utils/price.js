import { tdsDark } from '../constants/tdsColors';

export function getPriceColor(rate) {
  if (rate > 0) return tdsDark.priceUp;
  if (rate < 0) return tdsDark.priceDown;
  return tdsDark.priceFlat;
}

export function formatRate(rate) {
  if (rate == null) return '-';
  const sign = rate > 0 ? '+' : '';
  return `${sign}${rate.toFixed(2)}%`;
}

export function formatPrice(price) {
  if (price == null) return '-';
  return `₩${price.toLocaleString('ko-KR')}`;
}

export function formatProbability(prob) {
  if (prob == null) return '-';
  return `${(prob * 100).toFixed(1)}%`;
}
