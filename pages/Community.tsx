import React from 'react';
import { ThumbsUp, MessageCircle, Share2, MapPin, Lock } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';

export const Community: React.FC = () => {
  const user = useStore(state => state.user);
  const navigate = useNavigate();
  const isGuest = user?.role === 'guest';

  // MOCK DATA
  const posts = [
    {
      id: 1,
      user: 'Juan Dela Cruz',
      avatar: 'https://ui-avatars.com/api/?name=Juan+Dela+Cruz&background=random',
      content: 'Heavy traffic near Tandang Sora Palengke due to road repairs. Avoid if possible!',
      time: '10 mins ago',
      likes: 24,
      comments: 5,
      hasImage: true,
      image: 'https://picsum.photos/400/200'
    },
    {
      id: 2,
      user: 'Maria Clara',
      avatar: 'https://ui-avatars.com/api/?name=Maria+Clara&background=random',
      content: 'Just wanted to share that the new E-Jeep terminal is very organized. Kudos!',
      time: '1 hour ago',
      likes: 56,
      comments: 12,
      hasImage: false
    },
    {
      id: 3,
      user: 'Pedro Penduko',
      avatar: 'https://ui-avatars.com/api/?name=Pedro+Penduko&background=random',
      content: 'Does anyone know if the tricycle line at Culiat is long right now?',
      time: '2 hours ago',
      likes: 8,
      comments: 15,
      hasImage: false
    }
  ];

  const handleGuestAction = () => {
      if (confirm("You need to be logged in to interact with the community. Go to login page?")) {
          navigate('/account'); 
      }
  };

  return (
    <div className="h-full overflow-y-auto pb-24 pt-4 px-4 max-w-2xl mx-auto">
      
      {/* GUEST BANNER */}
      {isGuest && (
          <div className="bg-blue-600 text-white p-3 rounded-xl mb-6 flex items-center gap-3 shadow-lg shadow-blue-200">
              <div className="bg-white/20 p-2 rounded-lg"><Lock size={18} /></div>
              <div className="flex-1">
                  <p className="text-xs font-bold uppercase opacity-80">Guest Mode</p>
                  <p className="text-sm font-medium">Log in to create posts and interact.</p>
              </div>
              <button 
                onClick={() => navigate('/auth')}
                className="bg-white text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-50"
              >
                  Login
              </button>
          </div>
      )}

      <header className="mb-6 flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-slate-800">Community</h1>
            <p className="text-sm text-slate-500">Updates from fellow commuters</p>
        </div>
        <button 
            onClick={isGuest ? handleGuestAction : () => alert('New Post Modal would open here')}
            className={`px-4 py-2 rounded-full text-sm font-medium shadow-md transition-all flex items-center gap-2 ${isGuest ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
        >
            {isGuest && <Lock size={14} />} + New Post
        </button>
      </header>

      <div className={`space-y-4 ${isGuest ? 'opacity-90' : ''}`}>
        {posts.map(post => (
          <div key={post.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <div className="flex items-center gap-3 mb-3">
              <img src={post.avatar} alt={post.user} className="w-10 h-10 rounded-full" />
              <div>
                <h4 className="font-bold text-sm text-slate-800">{post.user}</h4>
                <p className="text-xs text-slate-400">{post.time}</p>
              </div>
            </div>
            
            <p className="text-sm text-slate-700 mb-3 leading-relaxed">
              {post.content}
            </p>

            {post.hasImage && (
                <div className="mb-3 rounded-lg overflow-hidden">
                    <img src={post.image} alt="Post attachment" className="w-full h-48 object-cover" />
                </div>
            )}

            <div className="flex items-center gap-2 mb-4">
                 <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-full flex items-center gap-1">
                    <MapPin size={10} /> Tandang Sora
                 </span>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <button 
                onClick={isGuest ? handleGuestAction : undefined}
                className={`flex items-center gap-1 text-sm transition-colors ${isGuest ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:text-blue-600'}`}
              >
                <ThumbsUp size={16} />
                <span>{post.likes}</span>
              </button>
              <button 
                onClick={isGuest ? handleGuestAction : undefined}
                className={`flex items-center gap-1 text-sm transition-colors ${isGuest ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:text-blue-600'}`}
              >
                <MessageCircle size={16} />
                <span>{post.comments}</span>
              </button>
              <button 
                onClick={isGuest ? handleGuestAction : undefined}
                className={`flex items-center gap-1 text-sm transition-colors ${isGuest ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:text-blue-600'}`}
              >
                <Share2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};