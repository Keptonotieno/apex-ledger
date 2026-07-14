import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Users, Award, Clock, CheckCircle, TrendingUp } from 'lucide-react';
import { Sale, UserProfile, TimeLog, Task } from '../../types';

interface EmployeePerformanceProps {
  sales: Sale[];
  employees: UserProfile[];
  timelogs: TimeLog[];
  tasks: Task[];
  formatKSh: (amount: number) => string;
}

export const EmployeePerformanceSection: React.FC<EmployeePerformanceProps> = ({
  sales,
  employees,
  timelogs,
  tasks,
  formatKSh
}) => {
  // Compute employee aggregation logs
  const employeeMetrics = useMemo(() => {
    return employees.map(emp => {
      // Sales volume
      const empSales = sales.filter(s => {
        const cashierId = (s as any).cashierId || (s as any).cashier_id;
        if (cashierId) return cashierId === emp.id;
        return s.cashierName === emp.name || s.cashierName === emp.email;
      });

      const totalSales = empSales.reduce((acc, curr) => acc + curr.netAmount, 0);
      const invoicesCount = empSales.length;

      // Clocked work hours
      const empLogs = timelogs.filter(t => t.userId === emp.id || t.userName === emp.name);
      const totalHours = empLogs.reduce((acc, curr) => acc + (curr.workHours || 0), 0);

      // Tasks
      const empTasks = tasks.filter(t => t.assignedToId === emp.id || t.assignedToName === emp.name);
      const completedTasks = empTasks.filter(t => t.status === 'Completed').length;
      const totalTasks = empTasks.length;

      // Productivity Quotient: sales per clocked hour (or flat score if hours are 0)
      const salesPerHour = totalHours > 0 ? totalSales / totalHours : 0;
      const taskRatio = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      // Unified rating score out of 100
      let productivityRating = 0;
      if (totalHours > 0 || totalTasks > 0) {
        // 50% weighted on checkout sales performance, 50% on task checklist efficiency
        const salesScore = Math.min((totalSales / 100000) * 100, 100); // 100k target
        const taskScore = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 100;
        productivityRating = Math.round((salesScore + taskScore) / 2);
      } else {
        productivityRating = invoicesCount > 0 ? 70 : 0; // Default flat if no hours but checkouts exist
      }

      return {
        id: emp.id,
        name: emp.name,
        role: emp.role,
        email: emp.email || 'N/A',
        sales: totalSales,
        checkoutCount: invoicesCount,
        hoursWorked: totalHours,
        tasksCompleted: completedTasks,
        tasksTotal: totalTasks,
        salesRate: salesPerHour,
        taskEfficiency: taskRatio,
        score: productivityRating
      };
    });
  }, [sales, employees, timelogs, tasks]);

  // Aggregates
  const stats = useMemo(() => {
    const activeStaffCount = employeeMetrics.length;
    
    // Top salesperson
    const sortedBySales = [...employeeMetrics].sort((a, b) => b.sales - a.sales);
    const topSalesperson = sortedBySales[0]?.sales > 0 ? sortedBySales[0] : null;

    // Total hours worked
    const totalHoursWorked = employeeMetrics.reduce((acc, e) => acc + e.hoursWorked, 0);

    // Total task complete count
    const totalTasksCompleted = employeeMetrics.reduce((acc, e) => acc + e.tasksCompleted, 0);

    return {
      activeStaffCount,
      topSalesperson,
      totalHoursWorked,
      totalTasksCompleted
    };
  }, [employeeMetrics]);

  // Chart data
  const chartData = useMemo(() => {
    return employeeMetrics.slice(0, 5).map(e => ({
      name: e.name.split(' ')[0],
      Sales: e.sales / 1000, // scaled in thousands
      'Hours Worked': e.hoursWorked,
      'Tasks Completed': e.tasksCompleted
    }));
  }, [employeeMetrics]);

  return (
    <div className="space-y-6">
      {/* KPI block row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-brand-border/60 bg-gray-950/25 border-b border-brand-border">
        <div className="p-5 font-mono">
          <span className="text-[9px] text-gray-500 uppercase tracking-wider block">TOP CASH SALES CONTRIBUTOR</span>
          <span className="text-lg font-bold text-cyan-400 mt-1 block truncate">
            {stats.topSalesperson ? stats.topSalesperson.name : 'N/A'}
          </span>
          <span className="text-[10px] text-gray-400 block mt-1">
            Sales: {stats.topSalesperson ? formatKSh(stats.topSalesperson.sales) : 'KSh 0'}
          </span>
        </div>
        <div className="p-5 font-mono">
          <span className="text-[9px] text-gray-500 uppercase tracking-wider block">SHIFT WORKHOURS DEPLOYED</span>
          <span className="text-xl font-bold text-emerald-400 mt-1 block">
            {stats.totalHoursWorked.toFixed(1)} Hours
          </span>
          <span className="text-[10px] text-gray-400 block mt-1">
            Clock-in logs within reporting period
          </span>
        </div>
        <div className="p-5 font-mono">
          <span className="text-[9px] text-gray-500 uppercase tracking-wider block">OPERATIONAL TASKS FINISHED</span>
          <span className="text-xl font-bold text-violet-400 mt-1 block">
            {stats.totalTasksCompleted} Completed
          </span>
          <span className="text-[10px] text-gray-400 block mt-1">
            Checkout checklists & stock errands
          </span>
        </div>
        <div className="p-5 font-mono">
          <span className="text-[9px] text-gray-500 uppercase tracking-wider block">TOTAL ACTIVE WORKFORCE</span>
          <span className="text-xl font-bold text-gray-200 mt-1 block">
            {stats.activeStaffCount} Employees
          </span>
          <span className="text-[10px] text-gray-400 block mt-1">
            Isolated tenant staff profiles
          </span>
        </div>
      </div>

      {/* Graphical section */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Employee performance visualizer chart */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <h4 className="text-xs font-semibold text-gray-200 font-sans">Corporate Productivity Metrics</h4>
            <p className="text-[10px] text-gray-500 font-mono mt-0.5">Comparing cashier sales checkout volume (x1,000 KSh) vs clock-in workhours.</p>
          </div>

          <div className="h-[250px] w-full bg-gray-950/20 p-2 rounded-xl border border-brand-border/40">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={10} className="font-mono" />
                  <YAxis stroke="#6b7280" fontSize={10} className="font-mono" />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }} />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }} />
                  <Bar name="Sales (x1,000 KSh)" dataKey="Sales" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  <Bar name="Hours Clocked" dataKey="Hours Worked" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar name="Tasks Done" dataKey="Tasks Completed" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 font-mono text-center">
                <Users className="w-8 h-8 text-gray-600 mb-2" />
                No employee work stats registered in this reporting window.
              </div>
            )}
          </div>
        </div>

        {/* Efficiency leaderboard rankings sidebar */}
        <div className="space-y-4 font-mono text-xs">
          <div>
            <h4 className="text-xs font-semibold text-gray-200 font-sans">Employee Efficiency Rankings</h4>
            <p className="text-[10px] text-gray-500 font-mono mt-0.5">Rankings based on our integrated workforce score.</p>
          </div>

          <div className="space-y-3.5 max-h-[250px] overflow-y-auto pr-1">
            {[...employeeMetrics]
              .sort((a, b) => b.score - a.score)
              .slice(0, 5)
              .map((emp, index) => (
                <div key={emp.id} className="p-3 bg-gray-950/40 border border-brand-border/50 rounded-xl space-y-2 text-[11px]">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                      <span className="text-[10px] text-cyan-400 font-bold">#{index+1}</span>
                      <span className="font-sans font-bold text-gray-200 truncate">{emp.name}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      emp.score >= 80 ? 'bg-emerald-500/10 text-emerald-400' :
                      emp.score >= 50 ? 'bg-cyan-500/10 text-cyan-400' :
                      'bg-gray-900 text-gray-500'
                    }`}>
                      {emp.score}% Index
                    </span>
                  </div>

                  <div className="w-full bg-gray-900 rounded-full h-1 overflow-hidden">
                    <div className={`h-1 rounded-full ${
                      emp.score >= 80 ? 'bg-emerald-500' :
                      emp.score >= 50 ? 'bg-cyan-500' :
                      'bg-gray-600'
                    }`} style={{ width: `${emp.score}%` }} />
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Complete Employee Performance Table */}
      <div className="p-6 pt-0 font-mono text-[11px]">
        <div className="border border-brand-border rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse text-gray-300">
            <thead>
              <tr className="bg-gray-950 text-gray-400 border-b border-brand-border text-[9px] uppercase tracking-wider">
                <th className="p-4">Staff Member</th>
                <th className="p-4">Access Role</th>
                <th className="p-4 text-center">Work Shift Logs</th>
                <th className="p-4 text-center">Tasks Efficiency</th>
                <th className="p-4 text-right">Sales Checkouts</th>
                <th className="p-4 text-right">Productivity Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/60">
              {employeeMetrics.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-gray-500 font-mono">No employees cataloged in this business.</td>
                </tr>
              ) : (
                employeeMetrics.map(emp => (
                  <tr key={emp.id} className="hover:bg-gray-900/35 transition">
                    <td className="p-4 font-bold text-gray-200 font-sans">
                      <div>{emp.name}</div>
                      <div className="text-[9px] text-gray-500 font-mono lowercase mt-0.5">{emp.email}</div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-950 border border-brand-border text-gray-400">
                        {emp.role}
                      </span>
                    </td>
                    <td className="p-4 text-center font-bold text-gray-200">{emp.hoursWorked.toFixed(1)} hrs ({emp.checkoutCount} checkout sessions)</td>
                    <td className="p-4 text-center">
                      <span className="text-gray-200 font-bold">{emp.tasksCompleted} / {emp.tasksTotal} tasks</span>
                      <span className="text-gray-500 text-[10px] ml-1">({emp.taskEfficiency.toFixed(0)}%)</span>
                    </td>
                    <td className="p-4 text-right font-bold text-emerald-400">{formatKSh(emp.sales)}</td>
                    <td className="p-4 text-right font-bold">
                      <span className={`text-xs ${
                        emp.score >= 80 ? 'text-emerald-400' :
                        emp.score >= 50 ? 'text-cyan-400' :
                        'text-gray-400'
                      }`}>{emp.score}%</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
