import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import cn from '@/utils/classnames';

interface TableProps {
  children: React.ReactNode;
}

interface TableRow {
  key: string;
  cells: React.ReactNode[];
}

interface TableData {
  headers: TableRow;
  bodyRows: TableRow[];
}

const parseTableData = (children: React.ReactNode): TableData => {
  const rows: React.ReactElement[] = React.Children.toArray(children) as React.ReactElement[];
  const thead = rows.find(row => row.type === 'thead') as React.ReactElement;
  const tbody = rows.find(row => row.type === 'tbody') as React.ReactElement;

  const headers: TableRow = { key: 'headers', cells: [] };
  if (thead) {
    const headerRows = React.Children.toArray(thead.props.children) as React.ReactElement[];
    if (headerRows.length > 0) {
      const headerCells = React.Children.toArray(headerRows[0].props.children) as React.ReactElement[];
      headers.cells = headerCells.map(cell => 
        cell.props.children ? cell.props.children : cell
      );
    }
  }

  const bodyRows: TableRow[] = [];
  if (tbody) {
    const bodyRowElements = React.Children.toArray(tbody.props.children) as React.ReactElement[];
    bodyRows.push(...bodyRowElements.map((row, index) => ({
      key: `row-${index}`,
      cells: React.Children.toArray(row.props.children).map((cell: any) => 
        cell.props?.children || cell
      )
    })));
  }

  return { headers, bodyRows };
};

export const Table: React.FC<TableProps> = ({ children }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const { headers, bodyRows } = useMemo(() => parseTableData(children), [children]);
  const totalPages = Math.ceil(bodyRows.length / rowsPerPage);

  const getPlainText = (node: React.ReactNode): string => {
    if (typeof node === 'string') return node;
    if (typeof node === 'number') return node.toString();
    if (node instanceof Date) return node.toISOString();
    if (Array.isArray(node)) return node.map(getPlainText).join('');
    if (React.isValidElement(node)) {
      if (node.props.children) return getPlainText(node.props.children);
      return '';
    }
    return '';
  };

  const handleExport = () => {
    const allData = [];
    const headersPlain = headers.cells.map(cell => getPlainText(cell));
    allData.push(headersPlain);
    
    bodyRows.forEach(row => {
      const rowData = row.cells.map(cell => getPlainText(cell));
      allData.push(rowData);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(allData);
    const workbook = XLSX.utils.book_new();
    
    const colWidths = allData[0].map(() => ({ wch: 20 }));
    worksheet['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    XLSX.writeFile(workbook, '工作流导出数据.xlsx');
  };

  const displayedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return bodyRows.slice(startIndex, startIndex + rowsPerPage);
  }, [bodyRows, currentPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="markdown-table-container relative rounded-lg border border-gray-200 shadow-sm overflow-hidden bg-white">
      {/* 顶部工具栏 - 包含标题和导出按钮 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-semibold text-gray-800">数据表格</h2>
        <button
          onClick={handleExport}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors shadow-sm flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          导出为XLSX
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50 border-b border-gray-300">
            <tr>
              {headers.cells.map((cell, index) => (
                <th 
                  key={`header-${index}`} 
                  className="font-medium text-gray-700 text-base text-left py-3 px-4"
                >
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody>
            {displayedRows.map((row, rowIndex) => (
              <tr 
                key={row.key} 
                className={cn(
                  "border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors",
                  { 
                    'bg-white': rowIndex % 2 === 0,  // 偶数行使用白色背景
                    'bg-gray-50': rowIndex % 2 !== 0 // 奇数行使用浅灰色背景
                  }
                )}
              >
                {row.cells.map((cell, index) => {
                  const cellText = getPlainText(cell);
                  const isStatusCell = index === 3;
                  const statusClass = isStatusCell ? 
                    cellText === '已完成' ? 'text-green-600' :
                    cellText === '已暂停' ? 'text-yellow-600' :
                    cellText === '进行中' ? 'text-blue-600' : 
                    'text-gray-400' : '';
                  
                  return (
                    <td 
                      key={`${row.key}-cell-${index}`} 
                      className={`py-3 px-4 text-gray-600 text-base ${statusClass}`}
                    >
                      {cell}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center py-3 px-4 bg-gray-50 border-t border-gray-200">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium border border-gray-300 shadow-sm",
              {
                "bg-white text-gray-700 hover:bg-gray-50": currentPage !== 1,
                "bg-gray-100 text-gray-400 cursor-not-allowed": currentPage === 1
              }
            )}
          >
            上一页
          </button>
          
          <div className="mx-4 text-sm text-gray-600 font-medium">
            第 {currentPage} 页 / 共 {totalPages} 页
          </div>
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium border border-gray-300 shadow-sm",
              {
                "bg-white text-gray-700 hover:bg-gray-50": currentPage !== totalPages,
                "bg-gray-100 text-gray-400 cursor-not-allowed": currentPage === totalPages
              }
            )}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
};