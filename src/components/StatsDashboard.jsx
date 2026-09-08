export default function StatsDashboard({ stats, topAnswers }) {
  return (
    <section className="stats-panel glass-card">
      <p className="section-kicker">参与概览</p>
      <div className="stats-grid">
        <Stat value={stats.participants} label="参与人数" />
        <Stat value={stats.unique} label="不同答案" />
      </div>

      <div className="ranking-header">
        <span>热门答案</span>
        <span>次数</span>
      </div>
      {topAnswers.length > 0 ? (
        <ol className="ranking-list">
          {topAnswers.map((answer, index) => (
            <li key={answer.text}>
              <span className={`rank rank--${index + 1}`}>{index + 1}</span>
              <span className="ranking-list__answer">{answer.text}</span>
              <strong>{answer.value}</strong>
            </li>
          ))}
        </ol>
      ) : (
        <div className="ranking-empty">答案提交后，热门排行会显示在这里</div>
      )}
    </section>
  )
}

function Stat({ value, label }) {
  return (
    <div className="stat">
      <strong>{value.toLocaleString()}</strong>
      <span>{label}</span>
    </div>
  )
}
