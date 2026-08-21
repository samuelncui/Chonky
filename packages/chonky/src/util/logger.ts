export class Logger {
  public static error(...args: any[]): void {
    console.error('[Chonky runtime error]', ...args);
  }

  public static warn(...args: any[]): void {
    console.warn('[Chonky runtime warning]', ...args);
  }

  public static debug(...args: any[]): void {
    console.debug('[Chonky runtime debug]', ...args);
  }

  public static formatBullets(bullets: string[]): string {
    return `\n- ${bullets.join('\n- ')}`;
  }
}
