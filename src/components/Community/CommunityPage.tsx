import React, { useState } from 'react';
import { CommunityPost } from '../../types';
import { getStoredPosts, savePost } from '../../services/storage';
import { Users, Plus, Heart, MessageSquare, Tag, Send } from 'lucide-react';

export const CommunityPage: React.FC = () => {
  const [posts, setPosts] = useState<CommunityPost[]>(getStoredPosts());
  const [showNewPostModal, setShowNewPostModal] = useState(false);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('نصائح هندسية');
  const [content, setContent] = useState('');
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const newPost: CommunityPost = {
      id: `post_${Date.now()}`,
      authorName: 'مهندس الميكاترونكس',
      authorRole: 'عضو مجتمع الدكتور الذكي',
      title,
      content,
      category,
      tags: ['ميكاترونكس', 'نقاش'],
      likes: 1,
      comments: [],
      createdAt: new Date().toISOString(),
    };

    const updated = savePost(newPost);
    setPosts(updated);
    setShowNewPostModal(false);
    setTitle('');
    setContent('');
  };

  const handleAddComment = (postId: string) => {
    const text = commentInputs[postId];
    if (!text || !text.trim()) return;

    const updated = posts.map((p) => {
      if (p.id === postId) {
        return {
          ...p,
          comments: [
            ...p.comments,
            { id: `c_${Date.now()}`, author: 'أنت', text, date: 'الآن' },
          ],
        };
      }
      return p;
    });

    setPosts(updated);
    setCommentInputs({ ...commentInputs, [postId]: '' });
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Header */}
      <div className="bg-[#0D1B2A] border border-slate-800 rounded-2xl p-6 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">مجتمع المهندسين والطلاب</h1>
            <p className="text-xs text-slate-400">ملتقى مناقشات الميكاترونكس، تبادل الخبرات واستشارات الأكواد</p>
          </div>
        </div>

        <button
          onClick={() => setShowNewPostModal(true)}
          className="px-4 py-2.5 rounded-xl bg-cyan-500 text-black font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 hover:bg-cyan-400"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة منشور جديد</span>
        </button>
      </div>

      {/* Posts Feed */}
      <div className="space-y-6 max-w-4xl mx-auto">
        {posts.map((post) => (
          <div key={post.id} className="bg-[#0D1B2A] border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">{post.title}</h3>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span className="font-semibold text-cyan-400">{post.authorName}</span>
                  <span>·</span>
                  <span>{post.authorRole}</span>
                </div>
              </div>

              <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/30">
                {post.category}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line">{post.content}</p>

            {/* Comments List */}
            {post.comments.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                <span className="font-bold text-slate-400">التعليقات:</span>
                {post.comments.map((c) => (
                  <div key={c.id} className="p-2 rounded bg-slate-800/60 text-slate-300 flex items-start justify-between">
                    <div>
                      <strong className="text-cyan-400">{c.author}: </strong>
                      <span>{c.text}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">{c.date}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Add Comment Input */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <input
                type="text"
                placeholder="اكتب تعليقك..."
                value={commentInputs[post.id] || ''}
                onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
              />
              <button
                onClick={() => handleAddComment(post.id)}
                className="px-3.5 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 text-xs font-bold hover:bg-cyan-500 hover:text-black transition-colors"
              >
                تعليق
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* New Post Modal */}
      {showNewPostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#0D1B2A] border border-cyan-500/30 w-full max-w-xl rounded-2xl p-6 space-y-4 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">إضافة منشور للمجتمع</h3>
              <button onClick={() => setShowNewPostModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">عنوان الموضوع:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: استفسار حول برمجة ESP32..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">محتوى المنشور التفصيلي:</label>
                <textarea
                  rows={4}
                  required
                  placeholder="اكتب شرحاً واضحاً للموضوع..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-400 focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewPostModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-cyan-500 text-black font-bold shadow-lg"
                >
                  نشر الموضوع
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
