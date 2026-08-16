const stages = [
  { key: 'engineering', label: 'Engineering', progress: 10 },
  { key: 'procurement', label: 'Procurement', progress: 25 },
  { key: 'assembly', label: 'Assembly', progress: 45 },
  { key: 'testing', label: 'Testing / FAT', progress: 65 },
  { key: 'packing', label: 'Packing', progress: 80 },
  { key: 'shipping', label: 'Shipping', progress: 90 },
  { key: 'commissioning', label: 'Commissioning', progress: 95 },
  { key: 'completed', label: 'Completed', progress: 100 },
]

export default function ProjectTimeline({
  currentStage,
}: {
  currentStage: string
}) {
  const currentIndex = Math.max(
  stages.findIndex(s => s.key === currentStage),
  0
)

  return (
    <div className="card p-5">
      <h2 className="text-sm font-semibold text-navy-900 mb-4">
        Project Workflow
      </h2>

      <div className="space-y-4">
        {stages.map((stage, index) => {
          const isDone = index <= currentIndex
          const isCurrent = index === currentIndex

          return (
            <div key={stage.key} className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  isDone ? 'bg-navy-900' : 'bg-gray-200'
                }`}
              />

              <div className="flex-1">
                <div className="flex justify-between text-xs">
                  <span
                    className={
                      isCurrent
                        ? 'font-semibold text-navy-900'
                        : 'text-gray-500'
                    }
                  >
                    {stage.label}
                  </span>

                  <span className="text-gray-400">
                    {stage.progress}%
                  </span>
                </div>

                <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                  <div
                    className="h-full bg-navy-900 rounded-full"
                    style={{
                      width: isDone ? '100%' : '0%',
                    }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}