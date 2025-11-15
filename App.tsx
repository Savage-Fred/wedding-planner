


import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { View, AnalyzedMessage, Guest, Task, Urgency, GuestStatus, Category, WeddingEvent, User } from './types';
import { DashboardIcon, MailIcon, UsersIcon, CheckSquareIcon, MenuIcon, SparklesIcon, CalendarIcon, SettingsIcon, PlusCircleIcon, EditIcon, TrashIcon, XIcon, GoogleIcon, SignOutIcon, UploadIcon } from './components/icons';
import { analyzeCommunication } from './services/geminiService';
import * as googleSheetsService from './services/googleSheetsService';
import { initializeGsi, renderGoogleButton, promptOneTap } from './services/googleAuthService';
import { useAuth } from './contexts/AuthContext';


// MOCK DATA (for communications and tasks, guests are now from a service)
const initialMessages: AnalyzedMessage[] = [
    { communication: { id: 'msg1', from: 'Elegant Catering', subject: 'Your Wedding Menu & Final Invoice', body: '...', date: '2024-07-21T10:00:00Z', source: 'email' }, analysis: { summary: "Caterer sent the final invoice. Payment is due by Aug 15th. They also confirmed the vegetarian option for 5 guests.", urgency: 'high', sentiment: 'neutral', category: 'Vendor', tasks: [{ description: 'Pay catering invoice by Aug 15th', dueDate: '2024-08-15' }], guestUpdate: null } },
    { communication: { id: 'msg2', from: 'Aunt Susan', subject: 'So excited!', body: '...', date: '2024-07-20T15:30:00Z', source: 'email' }, analysis: { summary: "Aunt Susan RSVP'd for herself and Uncle Bob. They are attending and are very excited.", urgency: 'low', sentiment: 'positive', category: 'Guest RSVP', tasks: [], guestUpdate: { name: 'Susan & Bob', status: 'Attending', partySize: 2 } } },
];

const initialTasks: Task[] = [
    { id: 't1', description: 'Pay catering invoice by Aug 15th', completed: false, sourceMessageId: 'msg1', dueDate: '2024-08-15' },
    { id: 't2', description: 'Review DJ playlist', completed: true, sourceMessageId: 'msg3' },
];

const URGENCY_CLASSES: { [key in Urgency]: string } = { 
    urgent: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20', 
    high: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20', 
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20', 
    low: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20',
};
const STATUS_CLASSES: { [key in GuestStatus]: string } = { 
    Attending: 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400', 
    Declined: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400', 
    Pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400', 
};

// HELPER & AUTH COMPONENTS
const LoginScreen: React.FC = () => {
    const { handleSignIn } = useAuth();
    const buttonRendered = useRef(false);

    useEffect(() => {
        const initGsi = () => {
            if (initializeGsi(handleSignIn)) {
                const buttonDiv = document.getElementById('google-signin-button');
                if (buttonDiv && !buttonRendered.current) {
                    renderGoogleButton(buttonDiv);
                    promptOneTap();
                    buttonRendered.current = true;
                }
            }
        };

        const script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
        if (window.google) {
            initGsi();
        } else if (script) {
            script.onload = initGsi;
        }
    }, [handleSignIn]);

    return (
        <div className="w-full h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-900">
            <div className="text-center p-8">
                <h1 className="text-6xl font-bold text-gray-900 dark:text-white tracking-tight">Clara</h1>
                <p className="text-lg text-gray-600 dark:text-gray-300 mt-2">Your AI-Powered Wedding Planning Assistant</p>
                <p className="max-w-md mx-auto text-gray-500 dark:text-gray-400 mt-4">
                    Sign in to connect your communications and guest list, and let Clara handle the details.
                </p>
                <div id="google-signin-button" className="mt-8 mx-auto flex justify-center"></div>
            </div>
        </div>
    );
};

const UserProfile: React.FC<{ user: User; onSignOut: () => void; }> = ({ user, onSignOut }) => (
    <div className="p-4 mt-auto border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
            <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full" />
            <div className="ml-3">
                <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">{user.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
            </div>
            <button onClick={onSignOut} title="Sign Out" className="ml-auto p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <SignOutIcon className="w-5 h-5" />
            </button>
        </div>
    </div>
);


const Sidebar: React.FC<{ currentView: View; setView: (view: View) => void; isSidebarOpen: boolean; user: User; onSignOut: () => void; }> = ({ currentView, setView, isSidebarOpen, user, onSignOut }) => {
    const navItems = [
        { id: 'dashboard', icon: DashboardIcon, label: 'Dashboard' },
        { id: 'communications', icon: MailIcon, label: 'Communications' },
        { id: 'guests', icon: UsersIcon, label: 'Guest List' },
        { id: 'tasks', icon: CheckSquareIcon, label: 'Tasks' },
        { id: 'calendar', icon: CalendarIcon, label: 'Calendar' },
        { id: 'settings', icon: SettingsIcon, label: 'Settings' },
    ] as const;

    return (
        <aside className={`absolute md:relative z-20 h-full bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 w-64 transform transition-transform duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
            <div className="p-6">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Clara</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Your Wedding AI Assistant</p>
            </div>
            <nav className="mt-8 flex-1"><ul>{navItems.map(item => (<li key={item.id} className="px-4"><button onClick={() => setView(item.id)} className={`flex items-center w-full p-3 my-1 rounded-lg transition-colors duration-200 ${currentView === item.id ? 'bg-blue-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700/50'}`}><item.icon className="w-5 h-5 mr-3" /><span>{item.label}</span></button></li>))}</ul></nav>
            <UserProfile user={user} onSignOut={onSignOut} />
        </aside>
    );
};

const Header: React.FC<{ title: string; onMenuClick: () => void; }> = ({ title, onMenuClick }) => (
    <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700"><button onClick={onMenuClick} className="md:hidden p-2 -ml-2 text-gray-800 dark:text-white"><MenuIcon className="w-6 h-6" /></button><h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white capitalize">{title}</h2></header>
);

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ElementType; color: string }> = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between shadow-sm"><div><p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p><p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p></div><div className={`p-3 rounded-full ${color}`}><Icon className="w-6 h-6 text-white" /></div></div>
);

// VIEW COMPONENTS
const Dashboard: React.FC<{ messages: AnalyzedMessage[]; guests: Guest[]; tasks: Task[]; theme: 'light' | 'dark' }> = ({ messages, guests, tasks, theme }) => {
    const urgentItems = messages.filter(m => m.analysis.urgency === 'urgent' || m.analysis.urgency === 'high');
    const pendingRSVPs = guests.filter(g => g.status === 'Pending').length;
    const openTasks = tasks.filter(t => !t.completed).length;
    const categoryData = useMemo(() => {
        const counts = messages.reduce((acc, msg) => { const category = msg.analysis.category; acc[category] = (acc[category] || 0) + 1; return acc; }, {} as Record<Category, number>);
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [messages]);
    const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#6366F1'];
    const axisColor = theme === 'dark' ? '#9CA3AF' : '#6B7280';
    const tooltipTextColor = theme === 'dark' ? '#F9FAFB' : '#111827';
    
    return (<div className="space-y-6"><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"><StatCard title="New Messages" value={messages.length} icon={MailIcon} color="bg-blue-500" /><StatCard title="Urgent Items" value={urgentItems.length} icon={SparklesIcon} color="bg-red-500" /><StatCard title="Pending RSVPs" value={pendingRSVPs} icon={UsersIcon} color="bg-yellow-500" /><StatCard title="Open Tasks" value={openTasks} icon={CheckSquareIcon} color="bg-green-500" /></div><div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"><h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Message Categories</h3><div style={{ width: '100%', height: 300 }}><ResponsiveContainer><BarChart data={categoryData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}><XAxis dataKey="name" stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} /><YAxis stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} /><Tooltip wrapperClassName="!bg-white dark:!bg-gray-900 !border-gray-200 dark:!border-gray-700 !rounded-md !shadow-lg" cursor={{ fill: 'rgba(107, 114, 128, 0.1)' }} contentStyle={{ backgroundColor: 'transparent', border: 'none' }} itemStyle={{color: tooltipTextColor}} /><Bar dataKey="value" radius={[4, 4, 0, 0]}>{categoryData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Bar></BarChart></ResponsiveContainer></div></div><div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"><h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Urgent Items</h3><ul className="space-y-3">{urgentItems.length > 0 ? urgentItems.map(item => (<li key={item.communication.id} className="p-3 bg-red-50 dark:bg-red-900/50 rounded-lg border border-red-200 dark:border-red-500/30"><p className="font-semibold text-red-800 dark:text-red-300">{item.communication.subject}</p><p className="text-sm text-red-600 dark:text-red-400">{item.analysis.summary}</p></li>)) : <p className="text-gray-500 dark:text-gray-400">No urgent items. Great job!</p>}</ul></div></div></div>);
};

const CommunicationsFeed: React.FC<{ messages: AnalyzedMessage[]; onNewMessage: (msg: AnalyzedMessage) => void; }> = ({ messages, onNewMessage }) => {
    const [newMessage, setNewMessage] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    // Fix: Changed `new date()` to `new Date()` to correctly instantiate a Date object.
    const handleAnalyze = async () => { if (!newMessage.trim()) return; setIsAnalyzing(true); const analysis = await analyzeCommunication(newMessage); const newComm: AnalyzedMessage = { communication: { id: `msg_${Date.now()}`, from: 'Manual Entry', subject: newMessage.substring(0, 30) + '...', body: newMessage, date: new Date().toISOString(), source: 'email', }, analysis, }; onNewMessage(newComm); setNewMessage(''); setIsAnalyzing(false); };
    return (<div className="space-y-6"><div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"><h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Analyze a New Message</h3><textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Paste an email or message here..." className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" rows={4} disabled={isAnalyzing} /><button onClick={handleAnalyze} disabled={isAnalyzing} className="mt-3 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-500 flex items-center justify-center">{isAnalyzing ? (<><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Analyzing...</>) : (<><SparklesIcon className="w-5 h-5 mr-2" /> Analyze with AI</>)}</button></div><div className="space-y-4">{messages.map(({ communication, analysis }) => (<div key={communication.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"><div className="flex justify-between items-start"><div><p className="font-bold text-gray-900 dark:text-white">{communication.subject}</p><p className="text-sm text-gray-500 dark:text-gray-400">From: {communication.from} &bull; {new Date(communication.date).toLocaleDateString()}</p></div><span className={`text-xs font-semibold px-2 py-1 rounded-full border ${URGENCY_CLASSES[analysis.urgency]}`}>{analysis.urgency}</span></div><p className="mt-3 text-gray-700 dark:text-gray-300">{analysis.summary}</p><div className="mt-4 flex flex-wrap gap-2"><span className="text-xs font-medium px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">{analysis.category}</span><span className="text-xs font-medium px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">Sentiment: {analysis.sentiment}</span></div></div>))}</div></div>);
};

const GuestListManager: React.FC<{ guests: Guest[]; onAdd: () => void; onEdit: (guest: Guest) => void; onDelete: (id: string) => void; isLoading: boolean; error: string | null; onImport: () => void; isImporting: boolean; }> = ({ guests, onAdd, onEdit, onDelete, isLoading, error, onImport, isImporting }) => (
    <div>
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Guest List</h3>
            <div className="flex items-center gap-2">
                 <button onClick={onImport} disabled={isImporting} className="flex items-center bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 transition-colors disabled:opacity-50">
                    {isImporting ? (
                        <><svg className="animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Importing...</>
                    ) : (
                        <><UploadIcon className="w-5 h-5 mr-2" /> Import CSV</>
                    )}
                </button>
                <button onClick={onAdd} className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"><PlusCircleIcon className="w-5 h-5 mr-2" /> Add Guest</button>
            </div>
        </div>
        {(isLoading || isImporting) && <div className="text-center p-8 text-gray-500 dark:text-gray-400">{isImporting ? 'Importing guests from CSV...' : 'Loading guest list...'}</div>}
        {error && <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg relative" role="alert"><strong className="font-bold">Error: </strong><span className="block sm:inline">{error}</span></div>}
        {!(isLoading || isImporting) && !error && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                <div className="overflow-x-auto"><table className="w-full text-left min-w-[600px]"><thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700"><tr><th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th><th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th><th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Party</th><th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Category</th><th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th></tr></thead><tbody className="divide-y divide-gray-200 dark:divide-gray-700">{guests.map(guest => (<tr key={guest.id}><td className="p-4 font-medium text-gray-900 dark:text-gray-100">{guest.name}</td><td className="p-4"><span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_CLASSES[guest.status]}`}>{guest.status}</span></td><td className="p-4 text-gray-600 dark:text-gray-300">{guest.partySize}</td><td className="p-4 text-gray-600 dark:text-gray-300">{guest.category}</td><td className="p-4"><div className="flex items-center gap-2"><button onClick={() => onEdit(guest)} className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"><EditIcon className="w-5 h-5" /></button><button onClick={() => onDelete(guest.id)} className="p-1 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400"><TrashIcon className="w-5 h-5" /></button></div></td></tr>))}</tbody></table></div>
            </div>
        )}
    </div>
);

const TaskList: React.FC<{ tasks: Task[]; onToggle: (id: string) => void; }> = ({ tasks, onToggle }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"><ul className="divide-y divide-gray-200 dark:divide-gray-700">{tasks.map(task => (<li key={task.id} className="py-4 flex items-center"><input type="checkbox" checked={task.completed} onChange={() => onToggle(task.id)} className="h-5 w-5 rounded bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-blue-500 focus:ring-blue-600 focus:ring-offset-white dark:focus:ring-offset-gray-800" /><div className="ml-4"><p className={`font-medium ${task.completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-100'}`}>{task.description}</p>{task.dueDate && <p className="text-sm text-gray-500 dark:text-gray-400">Due: {new Date(task.dueDate).toLocaleDateString()}</p>}</div></li>))}</ul></div>
);

const CalendarView: React.FC<{ events: WeddingEvent[] }> = ({ events }) => {
    const generateGoogleCalendarLink = (event: WeddingEvent) => {
        const toGoogleDate = (date: string) => new Date(date).toISOString().replace(/-|:|\.\d{3}/g, '');
        const url = new URL('https://www.google.com/calendar/render');
        url.searchParams.append('action', 'TEMPLATE');
        url.searchParams.append('text', event.title);
        url.searchParams.append('dates', `${toGoogleDate(event.start)}/${toGoogleDate(event.end)}`);
        url.searchParams.append('details', event.description);
        return url.toString();
    };
    return (<div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"><h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Upcoming Deadlines & Events</h3><div className="space-y-4">{[...events].sort((a,b) => new Date(a.start).getTime() - new Date(b.start).getTime()).map(event => (<div key={event.id} className="p-4 border-l-4 border-blue-500 bg-gray-50 dark:bg-gray-900/50 rounded-r-lg"><div className="flex justify-between items-center"><h4 className="font-semibold text-gray-800 dark:text-gray-100">{event.title}</h4><p className="text-sm font-medium text-gray-600 dark:text-gray-300">{new Date(event.start).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</p></div><p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{event.description}</p><a href={generateGoogleCalendarLink(event)} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 mt-2 inline-block">Add to Google Calendar &rarr;</a></div>))}</div></div>)
};

const SettingsView: React.FC<{ user: User }> = ({ user }) => {
    const [sheetUrl, setSheetUrl] = useState(googleSheetsService.getSheetUrl() || '');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const defaultUrl = 'https://docs.google.com/spreadsheets/d/1L21xHuqkY8wF6dImVVQd5CiQZ8SQbq8AJY8NEg4mQFI/edit';

    const handleSave = () => {
        const urlToSave = sheetUrl.trim() || defaultUrl;
        if (googleSheetsService.setSheetUrl(urlToSave)) {
            setSheetUrl(urlToSave);
            setSaveStatus('success');
        } else {
            setSaveStatus('error');
        }
        setTimeout(() => setSaveStatus('idle'), 2000);
    };

    return (<div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm max-w-2xl mx-auto"><h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Settings</h3><div className="space-y-8"><div><h4 className="font-semibold text-gray-800 dark:text-gray-200 text-lg">Connected Account</h4><div className="flex items-center mt-3 p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg"><img src={user.avatarUrl} alt={user.name} className="w-12 h-12 rounded-full" /><div className="ml-4"><p className="font-semibold text-gray-900 dark:text-white">{user.name}</p><p className="text-gray-600 dark:text-gray-300">{user.email}</p></div></div></div><div><h4 className="font-semibold text-gray-800 dark:text-gray-200 text-lg">Google Sheets Integration</h4><p className="text-gray-500 dark:text-gray-400 mt-1">Link your Guest List spreadsheet. The signed-in user must have at least view access.</p><div className="mt-3"><label htmlFor="sheet-url" className="block text-sm font-medium text-gray-600 dark:text-gray-300">Spreadsheet URL</label><input type="text" id="sheet-url" value={sheetUrl} onChange={e => setSheetUrl(e.target.value)} placeholder={defaultUrl} className="mt-1 w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div><div className="mt-3 flex items-center gap-4"><button onClick={handleSave} className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors">Save</button>{saveStatus === 'success' && <p className="text-green-600 dark:text-green-400 font-medium">Saved successfully!</p>}{saveStatus === 'error' && <p className="text-red-600 dark:text-red-400 font-medium">Invalid URL.</p>}</div></div></div></div>);
};

const GuestModal: React.FC<{ guest: Partial<Guest> | null; onClose: () => void; onSave: (guest: Guest) => Promise<void>; }> = ({ guest, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<Guest>>({});
    const [isSaving, setIsSaving] = useState(false);
    useEffect(() => { setFormData(guest || {}); }, [guest]);
    if (!guest) return null;
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { setFormData({ ...formData, [e.target.name]: e.target.value }); };
    const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); setIsSaving(true); await onSave(formData as Guest); setIsSaving(false); };

    return (<div className="fixed inset-0 bg-gray-900/50 dark:bg-black/70 z-30 flex items-center justify-center p-4"><div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg relative border border-gray-200 dark:border-gray-700"><button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 dark:hover:text-white"><XIcon className="w-6 h-6"/></button><form onSubmit={handleSubmit} className="p-8 space-y-4"><h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{formData.id ? 'Edit Guest' : 'Add Guest'}</h3><div><label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Name</label><input type="text" name="name" value={formData.name || ''} onChange={handleChange} className="mt-1 w-full p-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white" required /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Status</label><select name="status" value={formData.status || 'Pending'} onChange={handleChange} className="mt-1 w-full p-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white"><option>Pending</option><option>Attending</option><option>Declined</option></select></div><div><label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Party Size</label><input type="number" name="partySize" value={formData.partySize || 1} onChange={e => setFormData({...formData, partySize: parseInt(e.target.value) || 1 })} className="mt-1 w-full p-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white" min="1"/></div></div><div><label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Category</label><input type="text" name="category" value={formData.category || ''} onChange={handleChange} placeholder="e.g., Bride's Family" className="mt-1 w-full p-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white" /></div><div><label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Contact</label><input type="text" name="contact" value={formData.contact || ''} onChange={handleChange} placeholder="Email or Phone" className="mt-1 w-full p-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white" /></div><div><label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Meal Preference</label><select name="mealPreference" value={formData.mealPreference || 'Not Specified'} onChange={handleChange} className="mt-1 w-full p-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white"><option>Not Specified</option><option>Chicken</option><option>Fish</option><option>Vegetarian</option></select></div><div><label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Notes</label><textarea name="notes" value={formData.notes || ''} onChange={handleChange} className="mt-1 w-full p-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white" rows={2}></textarea></div><div className="flex justify-end gap-3 pt-4"><button type="button" onClick={onClose} className="px-4 py-2 bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500 border border-gray-300 dark:border-transparent">Cancel</button><button type="submit" disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-500">{isSaving ? 'Saving...' : 'Save Guest'}</button></div></form></div></div>);
};

// MAIN APP COMPONENT
export default function App() {
    const { user, isAuthenticated, isLoading: isAuthLoading, signOut } = useAuth();
    const [view, setView] = useState<View>('dashboard');
    const [messages, setMessages] = useState<AnalyzedMessage[]>(initialMessages);
    const [guests, setGuests] = useState<Guest[]>([]);
    const [guestsLoading, setGuestsLoading] = useState(true);
    const [guestsError, setGuestsError] = useState<string | null>(null);
    const [tasks, setTasks] = useState<Task[]>(initialTasks);
    const [events, setEvents] = useState<WeddingEvent[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
    const [editingGuest, setEditingGuest] = useState<Partial<Guest> | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const importFileRef = useRef<HTMLInputElement>(null);
    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e: MediaQueryListEvent) => setTheme(e.matches ? 'dark' : 'light');
        setTheme(mediaQuery.matches ? 'dark' : 'light');
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    const fetchGuests = useCallback(async () => {
        setGuestsLoading(true);
        setGuestsError(null);
        try {
            const fetchedGuests = await googleSheetsService.getGuests();
            setGuests(fetchedGuests);
        } catch (error: any) {
            setGuestsError(error.message);
        } finally {
            setGuestsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            fetchGuests();
        }
    }, [isAuthenticated, fetchGuests]);
    
    useEffect(() => {
        const tasksWithDueDate = tasks.filter(task => task.dueDate);
        const eventsFromTasks = tasksWithDueDate.map(task => ({ id: `evt-${task.id}`, title: task.description, start: new Date(task.dueDate!).toISOString(), end: new Date(task.dueDate!).toISOString(), description: `Task from message ID: ${task.sourceMessageId}` }));
        setEvents(eventsFromTasks);
    }, [tasks]);

    const handleNewMessage = useCallback((newMessage: AnalyzedMessage) => {
        setMessages(prev => [newMessage, ...prev]);
        if (newMessage.analysis.tasks.length > 0) {
            const newTasks = newMessage.analysis.tasks.map(t => ({ id: `t_${Date.now()}_${Math.random()}`, description: t.description, completed: false, sourceMessageId: newMessage.communication.id, dueDate: t.dueDate, }));
            setTasks(prev => [...prev, ...newTasks]);
        }
    }, []);

    const handleToggleTask = useCallback((id: string) => { setTasks(prev => prev.map(task => task.id === id ? { ...task, completed: !task.completed } : task)); }, []);
    const handleAddGuest = () => { setEditingGuest({ partySize: 1, status: 'Pending', mealPreference: 'Not Specified' }); setIsGuestModalOpen(true); };
    const handleEditGuest = (guest: Guest) => { setEditingGuest(guest); setIsGuestModalOpen(true); };
    const handleDeleteGuest = async (id: string) => {
      if(window.confirm('Are you sure you want to delete this guest?')) {
        await googleSheetsService.deleteGuest(id);
        fetchGuests();
      }
    };
    const handleSaveGuest = async (guest: Guest) => {
        try {
            if (guest.id) {
                await googleSheetsService.updateGuest(guest);
            } else {
                const { id, ...newGuestData } = guest;
                await googleSheetsService.addGuest(newGuestData);
            }
            fetchGuests();
            setIsGuestModalOpen(false);
            setEditingGuest(null);
        } catch(e) {
            console.error("Failed to save guest:", e);
            alert("Failed to save guest. Please try again.");
        }
    };

    const parseGuestCSV = (csvText: string): Omit<Guest, 'id'>[] => {
        const lines = csvText.trim().split(/\r\n|\n/);
        if (lines.length < 2) return [];
    
        const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, ''));
        const guests: Omit<Guest, 'id'>[] = [];
    
        const nameIndex = header.indexOf('name');
        const contactIndex = header.indexOf('contact');
        const partySizeIndex = header.indexOf('partysize');
        const categoryIndex = header.indexOf('category');
        const notesIndex = header.indexOf('notes');
    
        if (nameIndex === -1) {
            throw new Error("CSV must contain a 'Name' column. Accepted columns are: Name, Contact, PartySize, Category, Notes.");
        }
        
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const values = lines[i].split(',');
            const name = values[nameIndex]?.trim();
            
            if (name) {
                 guests.push({
                    name,
                    contact: values[contactIndex]?.trim() || '',
                    partySize: parseInt(values[partySizeIndex]?.trim(), 10) || 1,
                    status: 'Pending',
                    mealPreference: 'Not Specified',
                    category: values[categoryIndex]?.trim() || 'Imported',
                    notes: values[notesIndex]?.trim() || ''
                });
            }
        }
        return guests;
    };

    const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
    
        setIsImporting(true);
        setGuestsError(null);
        const reader = new FileReader();
    
        reader.onload = async (e) => {
            try {
                const text = e.target?.result as string;
                const newGuests = parseGuestCSV(text);
                if (newGuests.length === 0) {
                    throw new Error("No valid guest data found in the CSV. Please check the file format.");
                }
                await googleSheetsService.batchAddGuests(newGuests);
                await fetchGuests();
                alert(`${newGuests.length} guests imported successfully!`);
            } catch (error: any) {
                console.error("Failed to import guests:", error);
                setGuestsError(error.message);
            } finally {
                setIsImporting(false);
                if (event.target) {
                    event.target.value = '';
                }
            }
        };
        
        reader.onerror = () => {
            setGuestsError("Failed to read the file.");
            setIsImporting(false);
        };
    
        reader.readAsText(file);
    };

    const triggerImport = () => {
        importFileRef.current?.click();
    };

    if (isAuthLoading) {
        return <div className="w-full h-screen flex items-center justify-center bg-white dark:bg-gray-900 text-gray-900 dark:text-white">Loading...</div>;
    }

    if (!isAuthenticated || !user) {
        return <LoginScreen />;
    }

    const renderView = () => {
        switch (view) {
            case 'dashboard': return <Dashboard messages={messages} guests={guests} tasks={tasks} theme={theme} />;
            case 'communications': return <CommunicationsFeed messages={messages} onNewMessage={handleNewMessage} />;
            case 'guests': return <GuestListManager guests={guests} onAdd={handleAddGuest} onEdit={handleEditGuest} onDelete={handleDeleteGuest} isLoading={guestsLoading} error={guestsError} onImport={triggerImport} isImporting={isImporting} />;
            case 'tasks': return <TaskList tasks={tasks} onToggle={handleToggleTask} />;
            case 'calendar': return <CalendarView events={events} />;
            case 'settings': return <SettingsView user={user} />;
            default: return <Dashboard messages={messages} guests={guests} tasks={tasks} theme={theme} />;
        }
    };

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
            <input type="file" ref={importFileRef} onChange={handleFileImport} className="hidden" accept=".csv" />
            <Sidebar user={user} onSignOut={signOut} currentView={view} setView={(v) => { setView(v); setIsSidebarOpen(false); }} isSidebarOpen={isSidebarOpen} />
            {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/50 z-10 md:hidden"></div>}
            <main className="flex-1 flex flex-col overflow-y-auto">
                <Header title={view} onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
                <div className="p-4 sm:p-6 lg:p-8 flex-1">{renderView()}</div>
            </main>
            {isGuestModalOpen && <GuestModal guest={editingGuest} onClose={() => { setIsGuestModalOpen(false); setEditingGuest(null); }} onSave={handleSaveGuest} />}
        </div>
    );
}