// The one row a write that returns its row must give back. A write that stored nothing is a fault of the database, not an answer, so it is
// loud. One place for it, so every write says it the same way.
export function onlyRow<Row>(rows: readonly Row[], what: string): Row {
  const [row] = rows;
  if (row === undefined) throw new Error(`The ${what} was not stored.`);
  return row;
}
