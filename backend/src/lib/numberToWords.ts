export function numberToWords(num: number): string {
  if (num === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const convertBelow1000 = (n: number): string => {
    if (n === 0) return '';
    const parts: string[] = [];
    const h = Math.floor(n / 100);
    if (h > 0) parts.push(ones[h] + ' Hundred');
    const r = n % 100;
    if (r > 0) {
      if (r < 20) parts.push(ones[r]);
      else parts.push(tens[Math.floor(r / 10)] + (r % 10 > 0 ? ' ' + ones[r % 10] : ''));
    }
    return parts.join(' ');
  };
  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);
  let result = '';
  const crore = Math.floor(integerPart / 10000000);
  const lakh = Math.floor((integerPart % 10000000) / 100000);
  const thousand = Math.floor((integerPart % 100000) / 1000);
  const remainder = integerPart % 1000;
  if (crore > 0) result += convertBelow1000(crore) + ' Crore ';
  if (lakh > 0) result += convertBelow1000(lakh) + ' Lakh ';
  if (thousand > 0) result += convertBelow1000(thousand) + ' Thousand ';
  if (remainder > 0) result += convertBelow1000(remainder);
  result = result.trim() + ' Rupees';
  if (decimalPart > 0) {
    result += ' and ' + convertBelow1000(decimalPart) + ' Paise';
  }
  return result + ' Only';
}
