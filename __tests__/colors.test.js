import { Colors } from '../constants/colors';

describe('Colors', () => {
  it('should have background colors defined', () => {
    expect(Colors.bgPrimary).toBe('#1e1e1e');
    expect(Colors.bgSecondary).toBe('#252526');
    expect(Colors.bgTertiary).toBe('#2d2d30');
  });

  it('should have text colors defined', () => {
    expect(Colors.textPrimary).toBe('#cccccc');
    expect(Colors.textSecondary).toBe('#9e9e9e');
  });

  it('should have accent colors defined', () => {
    expect(Colors.accentBlue).toBe('#007acc');
    expect(Colors.accentBlueHover).toBe('#1a8ad4');
  });

  it('should have signal colors defined', () => {
    expect(Colors.signalBuy).toBe('#f23645');
    expect(Colors.signalSell).toBe('#089981');
  });

  it('should have border color defined', () => {
    expect(Colors.borderColor).toBe('#3e3e42');
  });
});
