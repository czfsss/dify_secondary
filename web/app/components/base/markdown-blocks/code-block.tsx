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