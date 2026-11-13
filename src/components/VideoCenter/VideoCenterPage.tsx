import React, { useState } from 'react';
import { getStoredVideos } from '../../services/storage';
import { VideoResource } from '../../types';
import { Play, Eye, Clock, Search, ExternalLink } from 'lucide-react';

export const VideoCenterPage: React.FC = () => {
  const videos = getStoredVideos();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeVideo, setActiveVideo] = useState<VideoResource | null>(null);

  const filteredVideos = videos.filter((v) =>
    v.title.toLowerCase().includes(searchTerm.toLowerCase()) || v.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-12">
      
      {/* Header */}
      <div className="champagne-card rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl sky-icon-box flex items-center justify-center shrink-0">
            <Play className="w-7 h-7 fill-current" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A] dark:text-white">مركز المحاضرات والفيديوهات الهندسية</h1>
            <p className="text-xs text-[#475569] dark:text-slate-400">تجميع شامل للدروس التعليمية المرئية، الشروحات الجامعية وتطبيقات المحاكاة</p>
          </div>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#64748B] dark:text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            placeholder="البحث عن درس مرئي..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-9 pl-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-[rgba(212,175,55,0.35)] dark:border-slate-700 text-[#0F172A] dark:text-white placeholder:text-[#94A3B8] text-xs focus:border-[#0EA5E9] dark:focus:border-cyan-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredVideos.map((video) => (
          <div
            key={video.id}
            onClick={() => setActiveVideo(video)}
            className="champagne-card hover:border-[#0EA5E9] dark:hover:border-cyan-500/40 rounded-2xl overflow-hidden cursor-pointer transition-all hover:-translate-y-1 group"
          >
            <div className="relative h-48 bg-[#F8FAFC] dark:bg-slate-900 overflow-hidden">
              <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              <div className="absolute inset-0 bg-black/35 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                <div className="w-12 h-12 rounded-full bg-[#0EA5E9] dark:bg-cyan-500 text-white dark:text-black flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Play className="w-6 h-6 fill-current mr-0.5" />
                </div>
              </div>
              <span className="absolute bottom-2 left-2 text-[10px] font-mono px-2 py-0.5 rounded bg-black/80 text-white">
                {video.duration}
              </span>
            </div>

            <div className="p-5 space-y-2">
              <span className="text-[10px] font-bold text-[#0284C7] dark:text-cyan-400 bg-[#E0F2FE] dark:bg-cyan-500/10 px-2 py-0.5 rounded border border-[#0EA5E9]/25 dark:border-cyan-500/20">
                {video.category}
              </span>
              <h3 className="text-base font-bold text-[#0F172A] dark:text-white group-hover:text-[#0EA5E9] dark:group-hover:text-cyan-400 transition-colors">{video.title}</h3>

              <div className="flex items-center justify-between text-xs text-[#475569] dark:text-slate-400 pt-2 border-t border-[rgba(212,175,55,0.22)] dark:border-slate-800/60">
                <span>{video.author}</span>
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> {video.views} مشاهدة
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Video Player Modal */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 dark:bg-black/85 backdrop-blur-md p-4">
          <div className="champagne-card w-full max-w-4xl rounded-2xl p-6 space-y-4 text-[#0F172A] dark:text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[rgba(212,175,55,0.25)] dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-[#0F172A] dark:text-white">{activeVideo.title}</h3>
                <p className="text-xs text-[#0284C7] dark:text-cyan-400 font-semibold">القناة/المحاضر: {activeVideo.author}</p>
              </div>
              <button onClick={() => setActiveVideo(null)} className="text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white font-bold">✕ إغلاق</button>
            </div>

            {/* Embedded Responsive Player */}
            <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-[rgba(212,175,55,0.3)] dark:border-slate-800">
              <iframe
                src={`https://www.youtube.com/embed/${activeVideo.youtubeId}?autoplay=1`}
                title={activeVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
