import React from 'react';
import Sidebar from './Sidebar';
import TopNav from './TopNav';

export default function Layout({ children, activeTitle, onRefresh, refreshing }) {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav activeTitle={activeTitle} onRefresh={onRefresh} refreshing={refreshing} />
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
