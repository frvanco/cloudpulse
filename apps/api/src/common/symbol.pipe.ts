import { BadRequestException, type PipeTransform } from '@nestjs/common';

// Tickers : lettres, chiffres, point, tiret et deux-points (ex. BRK.B, MC:EPA).
const SYMBOL_PATTERN = /^[A-Za-z0-9.:-]{1,20}$/;

export class SymbolPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!SYMBOL_PATTERN.test(value)) {
      throw new BadRequestException('Invalid symbol');
    }
    return value.toUpperCase();
  }
}
