import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Search } from 'lucide-react';
import { MedicalInput } from './medical-input';

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

interface MedicalTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

export function MedicalTable<T extends Record<string, any>>({ 
  columns, 
  data, 
  searchable = false,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No data available',
  onRowClick
}: MedicalTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };
  
  const filteredData = searchable
    ? data.filter(row => 
        Object.values(row).some(value => 
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : data;
  
  const sortedData = sortKey
    ? [...filteredData].sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        
        if (aVal === bVal) return 0;
        
        const comparison = aVal < bVal ? -1 : 1;
        return sortDirection === 'asc' ? comparison : -comparison;
      })
    : filteredData;
  
  return (
    <div className="w-full">
      {searchable && (
        <div className="mb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[var(--input-background)] border-2 border-[var(--border-color)] rounded-lg focus:outline-none focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-color)] focus:ring-opacity-20"
            />
          </div>
        </div>
      )}
      
      <div className="overflow-x-auto rounded-lg border border-[var(--border-color)]">
        <table className="w-full">
          <thead className="bg-[var(--bg-light)] border-b border-[var(--border-color)]">
            <tr>
              {columns.map((column) => (
                <th 
                  key={column.key}
                  className={`
                    px-6 py-4 text-left
                    ${column.sortable ? 'cursor-pointer hover:bg-[var(--bg-gray)] transition-colors' : ''}
                  `}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    {column.header}
                    {column.sortable && (
                      <div className="flex flex-col">
                        <ChevronUp 
                          className={`w-3 h-3 ${sortKey === column.key && sortDirection === 'asc' ? 'text-[var(--primary-color)]' : 'text-[var(--text-disabled)]'}`} 
                        />
                        <ChevronDown 
                          className={`w-3 h-3 -mt-1 ${sortKey === column.key && sortDirection === 'desc' ? 'text-[var(--primary-color)]' : 'text-[var(--text-disabled)]'}`} 
                        />
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.length === 0 ? (
              <tr>
                <td 
                  colSpan={columns.length}
                  className="px-6 py-8 text-center text-[var(--text-secondary)]"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedData.map((row, rowIndex) => (
                <tr 
                  key={rowIndex}
                  className={`
                    border-b border-[var(--border-light)] last:border-b-0
                    ${onRowClick ? 'cursor-pointer hover:bg-[var(--bg-light)] transition-colors' : ''}
                  `}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column) => (
                    <td key={column.key} className="px-6 py-4">
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
