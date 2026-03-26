import { useState, useEffect, useMemo } from 'react';
import { Upload, BookOpen, Loader2 } from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';
import { getFrequencyMatrix, type FrequencyEntry } from '../../services/analyseService';

interface PYQChartProps {
    missionId: string | null;
}

function getBarColor(count: number): string {
    if (count >= 4) return '#EF4444';
    if (count >= 2) return '#F59E0B';
    return '#10B981';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload as FrequencyEntry;
    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 min-w-[180px]">
            <div className="border-l-2 border-indigo-500 pl-2">
                <p className="text-sm font-bold text-gray-900">{data.topicName}</p>
                <p className="text-lg font-mono font-bold mt-1" style={{ color: getBarColor(data.questionCount) }}>
                    Appeared {data.questionCount} time{data.questionCount !== 1 ? 's' : ''}
                </p>
                {data.sourceYears && data.sourceYears.length > 0 && (
                    <p className="text-[11px] font-mono text-gray-400 mt-1">
                        Years: {data.sourceYears.sort().join(' · ')}
                    </p>
                )}
            </div>
        </div>
    );
}

export default function PYQChart({ missionId }: PYQChartProps) {
    const [frequency, setFrequency] = useState<FrequencyEntry[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!missionId) {
            setFrequency([]);
            return;
        }
        setLoading(true);
        getFrequencyMatrix(missionId)
            .then(setFrequency)
            .catch(e => console.error('PYQ load error:', e))
            .finally(() => setLoading(false));
    }, [missionId]);

    if (!missionId || (frequency.length === 0 && !loading)) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
                    📝 PYQ Frequency
                </h3>
                <div className="text-center py-8">
                    <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                        <Upload className="w-5 h-5 text-gray-300" />
                    </div>
                    <p className="text-sm font-semibold text-gray-500">No PYQ data yet</p>
                    <p className="text-xs text-gray-400 mt-1 italic">
                        Upload past papers in Mission PLAN to unlock frequency analysis.
                    </p>
                    <button className="mt-3 text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 mx-auto">
                        <Upload className="w-3 h-3" /> Upload PYQs →
                    </button>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
                    📝 PYQ Frequency
                </h3>
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                    📝 PYQ Frequency
                </h3>
                <button className="text-xs text-gray-400 hover:text-indigo-600 flex items-center gap-1">
                    <Upload className="w-3 h-3" /> Add Papers
                </button>
            </div>

            <div className="h-[220px] md:h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={frequency} margin={{ top: 5, right: 5, left: -15, bottom: 40 }}>
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(0,0,0,0.06)"
                            horizontal={true}
                            vertical={false}
                        />
                        <XAxis
                            dataKey="topicName"
                            tick={{ fontSize: 10, fill: '#9CA3AF' }}
                            angle={-30}
                            textAnchor="end"
                            interval={0}
                            height={60}
                        />
                        <YAxis
                            tick={{ fontSize: 10, fill: '#9CA3AF' }}
                            allowDecimals={false}
                            axisLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.05)' }} />
                        <Bar
                            dataKey="questionCount"
                            radius={[4, 4, 0, 0]}
                            isAnimationActive={true}
                            animationDuration={600}
                        >
                            {frequency.map((entry, i) => (
                                <Cell key={i} fill={getBarColor(entry.questionCount)} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: '#EF4444' }} /> 4+ times</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: '#F59E0B' }} /> 2-3 times</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: '#10B981' }} /> 1 time</span>
            </div>
        </div>
    );
}
