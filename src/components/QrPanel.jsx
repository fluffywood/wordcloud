import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

export default function QrPanel({ joinUrl }) {
  const [copied, setCopied] = useState(false)

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      window.prompt('复制参与链接', joinUrl)
    }
  }

  return (
    <aside className="qr-panel glass-card">
      <div className="qr-panel__eyebrow">
        <span className="step-dot">01</span>
        扫码参与
      </div>

      <div className="qr-panel__code">
        {joinUrl ? (
          <QRCodeSVG
            value={joinUrl}
            size={244}
            level="M"
            marginSize={1}
            bgColor="transparent"
            fgColor="#111827"
            title="手机参与二维码"
          />
        ) : (
          <div className="qr-placeholder" />
        )}
        <span className="qr-panel__logo" aria-hidden="true">W</span>
      </div>

      <h2>打开手机相机扫一扫</h2>
      <p>无需注册，进入后即可提交答案</p>

      <button className="link-copy" type="button" onClick={copyUrl} disabled={!joinUrl}>
        <span className="link-copy__text">{joinUrl || '正在生成参与链接…'}</span>
        <span className="link-copy__action">{copied ? '已复制' : '复制'}</span>
      </button>

      <div className="qr-panel__hint">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-14v4l2.5 2.5" />
        </svg>
        手机和电脑需连接同一网络
      </div>
    </aside>
  )
}
