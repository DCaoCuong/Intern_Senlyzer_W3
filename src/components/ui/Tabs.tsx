import React, { ReactNode, useState } from 'react';

export interface TabItem {
    label: string;
    value: string;
    icon?: ReactNode;
    content: ReactNode;
}

export interface TabsProps {
    tabs: TabItem[];
    defaultTab?: string;
    onChange?: (value: string) => void;
}

export default function Tabs({ tabs, defaultTab, onChange }: TabsProps) {
    const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.value || '');

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        onChange?.(value);
    };

    const activeContent = tabs.find(tab => tab.value === activeTab)?.content;

    return (
        <div className="w-full">
            {/* Tab Headers */}
            <div className="flex border-b border-slate-200 overflow-x-auto">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.value;
                    return (
                        <button
                            key={tab.value}
                            onClick={() => handleTabChange(tab.value)}
                            className={`
                flex items-center gap-2 px-5 py-3 font-medium text-sm
                border-b-2 transition-all duration-200 whitespace-nowrap
                hover:bg-slate-50
                ${isActive
                                    ? 'border-sky-500 text-sky-600 bg-sky-50/50'
                                    : 'border-transparent text-slate-600 hover:text-slate-900'
                                }
              `}
                        >
                            {tab.icon && <span className={isActive ? 'text-sky-500' : 'text-slate-400'}>{tab.icon}</span>}
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <div className="p-6 bg-white">
                {activeContent}
            </div>
        </div>
    );
}
