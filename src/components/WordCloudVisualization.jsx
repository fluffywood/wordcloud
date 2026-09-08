import { useEffect, useMemo, useRef, useState } from 'react'
import cloud from 'd3-cloud'

const COLORS = ['#fb7185', '#a78bfa', '#38bdf8', '#2dd4bf', '#fbbf24', '#818cf8', '#f472b6']

function seededRandom(seed) {
  let value = seed || 1
  return () => {
    value = (value * 9301 + 49297) % 233280
    return value / 233280
  }
}

function hashWords(words) {
  return [...words]
    .sort((a, b) => a.text.localeCompare(b.text, 'zh-CN'))
    .reduce((hash, word) => {
      for (const character of word.text) {
        hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0
      }
      return hash
    }, 17)
}

function colorForWord(text) {
  return COLORS[Math.abs(hashWords([{ text }])) % COLORS.length]
}

export default function WordCloudVisualization({ words, loading }) {
  const containerRef = useRef(null)
  const [size, setSize] = useState({ width: 900, height: 520 })
  const [placedWords, setPlacedWords] = useState([])

  useEffect(() => {
    const element = containerRef.current
    if (!element) return undefined
    const updateSize = () => setSize({
      width: Math.max(320, element.clientWidth),
      height: Math.max(360, element.clientHeight),
    })
    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const layoutWords = useMemo(() => {
    if (!words.length) return []
    const values = words.map((word) => word.value)
    const max = Math.max(...values)
    const min = Math.min(...values)
    const visibleCount = Math.min(words.length, 80)
    const density = Math.min(1, Math.max(0, (visibleCount - 5) / 55))
    const maxFont = Math.max(44, Math.min(92, size.width / 8.5) - density * 28)
    const minFont = Math.max(14, (size.width < 560 ? 19 : 23) - density * 8)

    return words.slice(0, 80).map((word) => {
      const ratio = max === min ? (visibleCount === 1 ? 0.72 : 0) : (word.value - min) / (max - min)
      return {
        ...word,
        color: colorForWord(word.text),
        size: Math.round(minFont + Math.sqrt(ratio) * (maxFont - minFont)),
      }
    })
  }, [size.width, words])

  useEffect(() => {
    if (!layoutWords.length) {
      setPlacedWords([])
      return undefined
    }

    let cancelled = false
    let activeLayout
    const runLayout = (scale = 1) => {
      activeLayout = cloud()
        .size([size.width, size.height])
        .words(layoutWords.map((word) => ({ ...word })))
        .padding(Math.max(2, Math.round((size.width < 560 ? 5 : 9) * scale)))
        .rotate(() => 0)
        .font('Inter, PingFang SC, Microsoft YaHei, sans-serif')
        .fontWeight(700)
        .fontSize((word) => Math.max(9, Math.round(word.size * scale)))
        .spiral('archimedean')
        .random(seededRandom(Math.abs(hashWords(layoutWords))))
        .on('end', (nextWords) => {
          if (cancelled) return
          if (nextWords.length < layoutWords.length && scale > 0.56) {
            runLayout(scale - 0.1)
          } else {
            setPlacedWords(nextWords)
          }
        })
      activeLayout.start()
    }

    runLayout()
    return () => {
      cancelled = true
      activeLayout?.stop()
    }
  }, [layoutWords, size.height, size.width])

  return (
    <div className="word-cloud" ref={containerRef}>
      {loading ? (
        <div className="cloud-loading" aria-label="正在加载词云">
          {[72, 44, 88, 52, 64, 38, 56].map((width, index) => (
            <span key={width} style={{ width: `${width}px`, animationDelay: `${index * 90}ms` }} />
          ))}
        </div>
      ) : placedWords.length > 0 ? (
        <>
          <svg viewBox={`0 0 ${size.width} ${size.height}`} role="img" aria-label={`由 ${words.length} 个不同答案组成的实时词云`}>
            <g transform={`translate(${size.width / 2}, ${size.height / 2})`}>
              {placedWords.map((word, index) => (
                <text
                  className="cloud-word"
                  dominantBaseline="middle"
                  fill={word.color}
                  fontSize={word.size}
                  fontWeight="700"
                  key={`${word.text}-${word.value}`}
                  style={{ animationDelay: `${Math.min(index * 28, 400)}ms` }}
                  textAnchor="middle"
                  transform={`translate(${word.x}, ${word.y}) rotate(${word.rotate})`}
                >
                  <title>{word.text} · {word.value} 次</title>
                  {word.text}
                </text>
              ))}
            </g>
          </svg>
          <ul className="sr-only">
            {words.map((word) => <li key={word.text}>{word.text}，{word.value} 次</li>)}
          </ul>
        </>
      ) : (
        <div className="cloud-empty">
          <div className="cloud-empty__art" aria-hidden="true">
            <span>灵感</span><span>期待</span><span>✨</span><span>你的答案</span><span>创意</span>
          </div>
          <h3>词云正在等待第一份答案</h3>
          <p>请参与者扫描右侧二维码，提交后会立即显示</p>
        </div>
      )}
    </div>
  )
}
