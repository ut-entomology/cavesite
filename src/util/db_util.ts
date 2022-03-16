/**
 * Converts a query result row from snakecase column names to camelcase.
 */
export function toCamelRow<T>(snakeRow: Record<string, any>): T {
  const camelRow: Record<string, any> = {};
  for (const [snakeColumn, columnValue] of Object.entries(snakeRow)) {
    let camelColumn = snakeToCamelMap[snakeColumn];
    if (camelColumn === undefined) {
      const words = snakeColumn.split('_');
      camelColumn =
        words[0] +
        words
          .slice(1)
          .map((word) =>
            word == 'id' ? 'ID' : word[0].toUpperCase() + word.substring(1)
          )
          .join('');
      snakeToCamelMap[snakeColumn] = camelColumn;
    }
    camelRow[camelColumn] = columnValue;
  }
  return camelRow as T;
}
const snakeToCamelMap: Record<string, string> = {};
