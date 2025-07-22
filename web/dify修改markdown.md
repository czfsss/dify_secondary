\dify-main\web\app\components\base\markdown-blocks\table.tsx
```tsx
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
```
\dify-main\web\app\components\base\markdown-blocks\code-block.tsx
```tsx
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactEcharts from 'echarts-for-react'
import SyntaxHighlighter from 'react-syntax-highlighter'
import {
  atelierHeathDark,
  atelierHeathLight,
} from 'react-syntax-highlighter/dist/esm/styles/hljs'
import ActionButton from '@/app/components/base/action-button'
import CopyIcon from '@/app/components/base/copy-icon'
import SVGBtn from '@/app/components/base/svg'
import Flowchart from '@/app/components/base/mermaid'
import { Theme } from '@/types/app'
import useTheme from '@/hooks/use-theme'
import SVGRenderer from '../svg-gallery'
import MarkdownMusic from '@/app/components/base/markdown-blocks/music'
import ErrorBoundary from '@/app/components/base/markdown/error-boundary'

const capitalizationLanguageNameMap: Record<string, string> = {
  sql: 'SQL',
  javascript: 'JavaScript',
  java: 'Java',
  typescript: 'TypeScript',
  vbscript: 'VBScript',
  css: 'CSS',
  html: 'HTML',
  xml: 'XML',
  php: 'PHP',
  python: 'Python',
  yaml: 'Yaml',
  mermaid: 'Mermaid',
  markdown: 'MarkDown',
  makefile: 'MakeFile',
  echarts: 'ECharts',
  shell: 'Shell',
  powershell: 'PowerShell',
  json: 'JSON',
  latex: 'Latex',
  svg: 'SVG',
  abc: 'ABC',
}

const getCorrectCapitalizationLanguageName = (language: string) => {
  if (!language)
    return 'Plain'

  if (language in capitalizationLanguageNameMap)
    return capitalizationLanguageNameMap[language]

  return language.charAt(0).toUpperCase() + language.substring(1)
}

type EChartsEventParams = {
  type: string;
  seriesIndex?: number;
  dataIndex?: number;
  name?: string;
  value?: any;
  currentIndex?: number;
  [key: string]: any;
}

const CodeBlock: any = memo(({ inline, className, children = '', ...props }: any) => {
  const { theme } = useTheme()
  const [isSVG, setIsSVG] = useState(true)
  const [chartState, setChartState] = useState<'loading' | 'success' | 'error'>('loading')
  const [finalChartOption, setFinalChartOption] = useState<any>(null)
  const echartsRef = useRef<any>(null)
  const contentRef = useRef<string>('')
  const processedRef = useRef<boolean>(false)
  const instanceIdRef = useRef<string>(`chart-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`)
  const isInitialRenderRef = useRef<boolean>(true)
  const chartInstanceRef = useRef<any>(null)
  const resizeTimerRef = useRef<NodeJS.Timeout | null>(null)
  const finishedEventCountRef = useRef<number>(0)
  const match = /language-(\w+)/.exec(className || '')
  const language = match?.[1]
  const languageShowName = getCorrectCapitalizationLanguageName(language || '')
  const isDarkMode = theme === Theme.dark
  const [isExpanded, setIsExpanded] = useState(false)

  // MySQL代码格式化函数
  const formatMySQL = (code: string) => {
    // 基础格式化：关键词大写，添加换行和缩进
    return code
      .replace(/\b(SELECT|FROM|WHERE|JOIN|ON|AND|OR|GROUP BY|HAVING|ORDER BY|LIMIT)\b/gi, '\n$1')
      .replace(/\,(\w)/g, ', $1')
      .replace(/(\()\s*/g, '$1\n  ')
      .replace(/\s*(\))/g, '\n$1')
      .trim()
  }

  const echartsStyle = useMemo(() => ({
    height: '350px',
    width: '100%',
  }), [])

  const echartsOpts = useMemo(() => ({
    renderer: 'canvas',
    width: 'auto',
  }) as any, [])

  const debouncedResize = useCallback(() => {
    if (resizeTimerRef.current)
      clearTimeout(resizeTimerRef.current)

    resizeTimerRef.current = setTimeout(() => {
      if (chartInstanceRef.current)
        chartInstanceRef.current.resize()
      resizeTimerRef.current = null
    }, 200)
  }, [])

  const handleChartReady = useCallback((instance: any) => {
    chartInstanceRef.current = instance
    setTimeout(() => {
      if (chartInstanceRef.current)
        chartInstanceRef.current.resize()
    }, 200)
  }, [])

  const echartsEvents = useMemo(() => ({
    finished: (params: EChartsEventParams) => {
      finishedEventCountRef.current++
      if (finishedEventCountRef.current > 3) return
      if (chartInstanceRef.current) debouncedResize()
    },
  }), [debouncedResize])

  useEffect(() => {
    if (language !== 'echarts' || !chartInstanceRef.current) return

    const handleResize = () => {
      if (chartInstanceRef.current) debouncedResize()
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current)
    }
  }, [language, debouncedResize])
  
  useEffect(() => {
    if (language !== 'echarts') return
    if (!contentRef.current) {
      setChartState('loading')
      processedRef.current = false
    }

    const newContent = String(children).replace(/\n$/, '')
    if (contentRef.current === newContent) return
    contentRef.current = newContent

    const trimmedContent = newContent.trim()
    if (!trimmedContent) return

    const isCompleteJson = 
      (trimmedContent.startsWith('{') && trimmedContent.endsWith('}') &&
        trimmedContent.split('{').length === trimmedContent.split('}').length) ||
      (trimmedContent.startsWith('[') && trimmedContent.endsWith(']') &&
        trimmedContent.split('[').length === trimmedContent.split(']').length)

    if (isCompleteJson && !processedRef.current) {
      try {
        const parsed = JSON.parse(trimmedContent)
        if (typeof parsed === 'object' && parsed !== null) {
          setFinalChartOption(parsed)
          setChartState('success')
          processedRef.current = true
          return
        }
      } catch {
        try {
          // eslint-disable-next-line no-new-func
          const result = new Function(`return ${trimmedContent}`)()
          if (typeof result === 'object' && result !== null) {
            setFinalChartOption(result)
            setChartState('success')
            processedRef.current = true
            return
          }
        } catch {
          setChartState('error')
          processedRef.current = true
          return
        }
      }
    }

    const isIncomplete = 
      trimmedContent.length < 5 ||
      (trimmedContent.startsWith('{') && 
        (!trimmedContent.endsWith('}') || 
          trimmedContent.split('{').length !== trimmedContent.split('}').length)) ||
      (trimmedContent.startsWith('[') && 
        (!trimmedContent.endsWith(']') || 
          trimmedContent.split('[').length !== trimmedContent.split('}').length)) ||
      (trimmedContent.split('"').length % 2 !== 1) ||
      (trimmedContent.includes('{"') && !trimmedContent.includes('"}'))

    if (!isIncomplete && !processedRef.current) {
      let isValidOption = false
      try {
        const parsed = JSON.parse(trimmedContent)
        if (typeof parsed === 'object' && parsed !== null) {
          setFinalChartOption(parsed)
          isValidOption = true
        }
      } catch {
        try {
          // eslint-disable-next-line no-new-func
          const result = new Function(`return ${trimmedContent}`)()
          if (typeof result === 'object' && result !== null) {
            setFinalChartOption(result)
            isValidOption = true
          }
        } catch {
          setChartState('error')
          processedRef.current = true
        }
      }

      if (isValidOption) {
        setChartState('success')
        processedRef.current = true
      }
    }
  }, [language, children])

  const renderCodeContent = useMemo(() => {
    const content = String(children).replace(/\n$/, '')
    
    // 处理MySQL代码：是否展开
    const isMySQL = language === 'sql' || language === 'mysql'
    const shouldTruncate = isMySQL && !isExpanded
    const displayContent = isMySQL ? formatMySQL(content) : content
    
    switch (language) {
      case 'mermaid':
        return <Flowchart PrimitiveCode={content} theme={theme as 'light' | 'dark'} />
      case 'echarts': 
        if (chartState === 'loading') {
          return (
            <div style={{
              minHeight: '350px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottomLeftRadius: '10px',
              borderBottomRightRadius: '10px',
              backgroundColor: isDarkMode ? 'var(--color-components-input-bg-normal)' : 'transparent',
              color: 'var(--color-text-secondary)',
            }}>
              <div style={{ marginBottom: '12px', width: '24px', height: '24px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ animation: 'spin 1.5s linear infinite' }}>
                  <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                  <circle opacity="0.2" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                  <path d="M12 2C6.47715 2 2 6.47715 2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <div style={{ fontFamily: 'var(--font-family)', fontSize: '20px',fontWeight: 600 }}>图表正在生成中,请稍后...</div>
            </div>
          )
        }

        if (chartState === 'success' && finalChartOption) {
          finishedEventCountRef.current = 0
          return (
            <div style={{
              minWidth: '300px',
              minHeight: '350px',
              width: '100%',
              overflowX: 'auto',
              borderBottomLeftRadius: '10px',
              borderBottomRightRadius: '10px',
              transition: 'background-color 0.3s ease',
            }}>
              <ErrorBoundary>
                <ReactEcharts
                  ref={(e) => {
                    if (e && isInitialRenderRef.current) {
                      echartsRef.current = e
                      isInitialRenderRef.current = false
                    }
                  }}
                  option={finalChartOption}
                  style={echartsStyle}
                  theme={isDarkMode ? 'dark' : undefined}
                  opts={echartsOpts}
                  notMerge={false}
                  lazyUpdate={false}
                  onEvents={echartsEvents}
                  onChartReady={handleChartReady}
                />
              </ErrorBoundary>
            </div>
          )
        }

        const errorOption = { title: { text: 'ECharts error - Wrong option.' } }
        return (
          <div style={{
            minWidth: '300px',
            minHeight: '350px',
            width: '100%',
            overflowX: 'auto',
            borderBottomLeftRadius: '10px',
            borderBottomRightRadius: '10px',
            transition: 'background-color 0.3s ease',
          }}>
            <ErrorBoundary>
              <ReactEcharts
                ref={echartsRef}
                option={errorOption}
                style={echartsStyle}
                theme={isDarkMode ? 'dark' : undefined}
                opts={echartsOpts}
                notMerge={true}
              />
            </ErrorBoundary>
          </div>
        )
      case 'svg':
        if (isSVG) {
          return (
            <ErrorBoundary>
              <SVGRenderer content={content} />
            </ErrorBoundary>
          )
        }
        break
      case 'abc':
        return (
          <ErrorBoundary>
            <MarkdownMusic children={content} />
          </ErrorBoundary>
        )
      default:
        // MySQL代码特殊处理
        const truncatedContent = shouldTruncate 
          ? displayContent.split('\n').slice(0, 5).join('\n') + '\n...' 
          : displayContent
        
        return (
          <SyntaxHighlighter
            {...props}
            style={theme === Theme.light ? atelierHeathLight : atelierHeathDark}
            customStyle={{
              paddingLeft: 12,
              borderBottomLeftRadius: '10px',
              borderBottomRightRadius: '10px',
              backgroundColor: 'var(--color-components-input-bg-normal)',
              maxHeight: shouldTruncate ? '150px' : 'none',
              overflowY: 'auto',
            }}
            language={match?.[1]}
            showLineNumbers
            PreTag="div"
          >
            {truncatedContent}
          </SyntaxHighlighter>
        )
    }
  }, [children, language, isSVG, finalChartOption, props, theme, match, 
      chartState, isDarkMode, echartsStyle, echartsOpts, handleChartReady, 
      echartsEvents, isExpanded])

  if (inline || !match)
    return <code {...props} className={className}>{children}</code>

  return (
    <div className='relative'>
      <div className='flex h-8 items-center justify-between rounded-t-[10px] border-b border-divider-subtle bg-components-input-bg-normal p-1 pl-3'>
        <div className='system-xs-semibold-uppercase text-text-secondary'>{languageShowName}</div>
        <div className='flex items-center gap-1'>
          {/* MySQL专用纯CSS展开按钮 */}
          {(language === 'sql' || language === 'mysql') && (
            <ActionButton 
              className="text-text-secondary hover:text-primary css-toggle-button"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? "Collapse" : "Expand"}
              style={{
                position: 'relative',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* 纯CSS展开/收起图标 */}
              <div 
                className="css-icon" 
                style={{
                  position: 'relative',
                  width: '16px',
                  height: '16px',
                }}
              >
                <div 
                  className="css-icon-line css-icon-horizontal"
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '0',
                    width: '100%',
                    height: '3px',
                    backgroundColor: 'currentColor',
                    transform: 'translateY(-50%)',
                    borderRadius: '1px',
                  }}
                ></div>
                <div 
                  className="css-icon-line css-icon-vertical"
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '0',
                    width: '3px',
                    height: '100%',
                    backgroundColor: 'currentColor',
                    transform: isExpanded ? 'translateX(-50%) scaleY(0)' : 'translateX(-50%) scaleY(1)',
                    borderRadius: '1px',
                    transition: 'transform 0.2s ease',
                  }}
                ></div>
              </div>
            </ActionButton>
          )}
          
          {language === 'svg' && <SVGBtn isSVG={isSVG} setIsSVG={setIsSVG} />}
          <ActionButton>
            <CopyIcon content={String(children).replace(/\n$/, '')} />
          </ActionButton>
        </div>
      </div>
      {renderCodeContent}
    </div>
  )
})
CodeBlock.displayName = 'CodeBlock'

export default CodeBlock
```
\dify-main\web\app\components\base\markdown-blocks\index.ts
```tsx
/**
 * @fileoverview Barrel file for all markdown block components.
 * This allows for cleaner imports in other parts of the application.
 */

export { default as AudioBlock } from './audio-block'
export { default as CodeBlock } from './code-block'
export { default as Img } from './img'
export { default as Link } from './link'
export { default as Paragraph } from './paragraph'
export { default as PreCode } from './pre-code'
export { default as ScriptBlock } from './script-block'
export { default as VideoBlock } from './video-block'

// Assuming these are also standalone components in this directory intended for Markdown rendering
export { default as MarkdownButton } from './button'
export { default as MarkdownForm } from './form'
export { default as ThinkBlock } from './think-block'
export * from './table'
```
\dify-main\web\app\components\base\markdown\index.tsx
```tsx
import ReactMarkdown from 'react-markdown'
import 'katex/dist/katex.min.css'
import RemarkMath from 'remark-math'
import RemarkBreaks from 'remark-breaks'
import RehypeKatex from 'rehype-katex'
import RemarkGfm from 'remark-gfm'
import RehypeRaw from 'rehype-raw'
import { flow } from 'lodash-es'
import cn from '@/utils/classnames'
import { customUrlTransform, preprocessLaTeX, preprocessThinkTag } from './markdown-utils'
import {
  AudioBlock,
  CodeBlock,
  Img,
  Link,
  MarkdownButton,
  MarkdownForm,
  Paragraph,
  ScriptBlock,
  ThinkBlock,
  VideoBlock,
  Table,
} from '@/app/components/base/markdown-blocks'

/**
 * @fileoverview Main Markdown rendering component.
 * This file was refactored to extract individual block renderers and utility functions
 * into separate modules for better organization and maintainability as of [Date of refactor].
 * Further refactoring candidates (custom block components not fitting general categories)
 * are noted in their respective files if applicable.
 */

export function Markdown(props: { content: string; className?: string; customDisallowedElements?: string[] }) {
  const latexContent = flow([
    preprocessThinkTag,
    preprocessLaTeX,
  ])(props.content)

  return (
    <div className={cn('markdown-body', '!text-text-primary', props.className)}>
      <ReactMarkdown
        remarkPlugins={[
          RemarkGfm,
          [RemarkMath, { singleDollarTextMath: false }],
          RemarkBreaks,
        ]}
        rehypePlugins={[
          RehypeKatex,
          RehypeRaw as any,
          // The Rehype plug-in is used to remove the ref attribute of an element
          () => {
            return (tree: any) => {
              const iterate = (node: any) => {
                if (node.type === 'element' && node.properties?.ref)
                  delete node.properties.ref

                if (node.type === 'element' && !/^[a-z][a-z0-9]*$/i.test(node.tagName)) {
                  node.type = 'text'
                  node.value = `<${node.tagName}`
                }

                if (node.children)
                  node.children.forEach(iterate)
              }
              tree.children.forEach(iterate)
            }
          },
        ]}
        urlTransform={customUrlTransform}
        disallowedElements={['iframe', 'head', 'html', 'meta', 'link', 'style', 'body', ...(props.customDisallowedElements || [])]}
        components={{
          code: CodeBlock,
          img: Img,
          video: VideoBlock,
          audio: AudioBlock,
          a: Link,
          p: Paragraph,
          button: MarkdownButton,
          form: MarkdownForm,
          script: ScriptBlock as any,
          details: ThinkBlock,
          table: Table as any
        }}
      >
        {/* Markdown detect has problem. */}
        {latexContent}
      </ReactMarkdown>
    </div>
  )
}
```
pnpm add xlsx

# 进入项目根目录（web文件夹）
cd C:\Users\陈扬\Desktop\Github\Dify-main\web

# 删除构建缓存
rd /s /q .next

# 删除依赖包
rd /s /q node_modules

pupm install

pupm build

pnpm start