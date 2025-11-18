interface StepperProps {
  currentStep: number;
  steps: string[];
}

export function Stepper({ currentStep, steps }: StepperProps) {
  return (
    <div className="fixed left-8 top-1/2 -translate-y-1/2 z-10">
      <div className="flex flex-col gap-8">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;

          return (
            <div key={stepNumber} className="flex items-center gap-4">
              <div className="relative">
                {index < steps.length - 1 && (
                  <div
                    className={`absolute left-1/2 top-full -translate-x-1/2 w-0.5 h-8 transition-colors duration-500 ${
                      isCompleted ? "bg-[#3A6BFC]" : "bg-gray-300"
                    }`}
                  />
                )}

                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-500 ${
                    isActive
                      ? "bg-[#3A6BFC] text-white scale-125 shadow-md"
                      : isCompleted
                        ? "bg-[#3A6BFC] text-white"
                        : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {isCompleted ? (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    stepNumber
                  )}
                </div>
              </div>

              <span
                className={`text-sm font-medium transition-all duration-500 ${
                  isActive
                    ? "text-blue-600 font-bold"
                    : isCompleted
                      ? "text-gray-700"
                      : "text-gray-400"
                }`}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
