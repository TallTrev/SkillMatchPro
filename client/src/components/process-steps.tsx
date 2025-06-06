import { Upload, Search, ServerCog, Download } from "lucide-react";

interface ProcessStepsProps {
  currentStep: number;
  onStepClick: (stepId: number) => void;
}

export default function ProcessSteps({ currentStep, onStepClick }: ProcessStepsProps) {
  const steps = [
    { id: 0, name: "Upload", icon: Upload },
    { id: 1, name: "Extract", icon: Search },
    { id: 2, name: "Process", icon: ServerCog },
    { id: 3, name: "Results", icon: Download },
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep >= step.id;
            const isConnector = index < steps.length - 1;
            const isClickable = currentStep >= step.id;

            return (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                    isActive
                      ? 'bg-primary text-white'
                      : 'bg-slate-200 text-slate-500'
                  } ${
                    isClickable ? 'cursor-pointer hover:opacity-90' : 'cursor-not-allowed'
                  }`}
                  onClick={() => isClickable && onStepClick(step.id)}
                >
                  <Icon className="w-4 h-4" />
                  <span>{step.id + 1}. {step.name}</span>
                </div>
                {isConnector && (
                  <div className="w-12 h-px bg-slate-300 mx-2"></div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
