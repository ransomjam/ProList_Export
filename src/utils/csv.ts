// CSV generation utilities

export const toCsv = (rows: Record<string, any>[]): string => {
  if (rows.length === 0) return '';
  
  const headers = Object.keys(rows[0]);
  const csvHeaders = headers.map(header => `"${header}"`).join(',');
  
  const csvRows = rows.map(row => 
    headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '""';
      const stringValue = String(value).replace(/"/g, '""');
      return `"${stringValue}"`;
    }).join(',')
  );
  
  return [csvHeaders, ...csvRows].join('\n');
};