'use client';

interface Props {
  spent: number;
  budget: number;
  label?: string;
  showPercent?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig = {
  on_track: { color: 'bg-green-500', textColor: 'text-green-600' },
  over_pacing: { color: 'bg-yellow-500', textColor: 'text-yellow-600' },
  under_pacing: { color: 'bg-blue-500', textColor: 'text-blue-600' },
  exhausted: { color: 'bg-red-500', textColor: 'text-red-600' },
};

const sizeConfig = {
  sm: { height: 'h-1.5', text: 'text-xs' },
  md: { height: 'h-2.5', text: 'text-sm' },
  lg: { height: 'h-4', text: 'text-base' },
};

export function BudgetProgressBar({ spent, budget, label, showPercent = true, size = 'md' }: Props) {
  if (budget === 0 || budget === null || budget === undefined) {
    return (
      <div className="w-full">
        {label && <p className={`${sizeConfig[size].text} text-muted-foreground mb-1`}>{label}</p>}
        <div className={`w-full ${sizeConfig[size].height} rounded-full bg-muted`}>
          <div className="w-full h-full rounded-full bg-gray-400" />
        </div>
        <p className={`${sizeConfig[size].text} text-muted-foreground mt-1`}>ไม่ได้ตั้งงบ</p>
      </div>
    );
  }

  const percent = Math.min((spent / budget) * 100, 100);
  const isOver = spent > budget;

  let status: keyof typeof statusConfig = 'on_track';
  if (isOver) status = 'exhausted';
  else if (percent >= 80) status = 'over_pacing';
  else if (percent <= 50) status = 'under_pacing';

  const config = statusConfig[status];
  const sizeStyles = sizeConfig[size];

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between items-center mb-1">
          <p className={`${sizeStyles.text} text-muted-foreground`}>{label}</p>
          {showPercent && (
            <span className={`${sizeStyles.text} font-medium ${config.textColor}`}>
              {percent.toFixed(0)}%
            </span>
          )}
        </div>
      )}
      <div className={`w-full ${sizeStyles.height} rounded-full bg-muted overflow-hidden`}>
        <div
          className={`h-full ${config.color} transition-all duration-500 rounded-full`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex justify-between items-center mt-1">
        <span className={`${sizeStyles.text} text-muted-foreground`}>
          {formatCurrency(spent)} / {formatCurrency(budget)}
        </span>
        {isOver && (
          <span className={`${sizeStyles.text} font-medium text-red-600`}>
            เกินงบ!
          </span>
        )}
      </div>
    </div>
  );
}

function formatCurrency(amount: number): string {
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  }
  return amount.toString();
}