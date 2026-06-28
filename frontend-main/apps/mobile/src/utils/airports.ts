import { airportDisplayNames } from './airportDisplayNames.generated';

export function getAirportDisplayName(value: string): string {
  const airportCode = getAirportCode(value);

  if (!airportCode) {
    return value;
  }

  const airportName = airportDisplayNames[airportCode];

  return airportName ? `${airportName} (${airportCode})` : value;
}

function getAirportCode(value: string): string {
  const normalizedValue = value.trim().toUpperCase();

  if (!normalizedValue) {
    return '';
  }

  if (airportDisplayNames[normalizedValue]) {
    return normalizedValue;
  }

  const parentheticalCode = normalizedValue.match(/\(([A-Z0-9]{3,4})\)/)?.[1];

  if (parentheticalCode && airportDisplayNames[parentheticalCode]) {
    return parentheticalCode;
  }

  const codeToken = normalizedValue
    .split(/[^A-Z0-9]+/)
    .find((token) => token.length >= 3 && token.length <= 4 && airportDisplayNames[token]);

  return codeToken || '';
}
