import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

const getApiBase = () => import.meta.env.VITE_API_URL || 'http://localhost:5000';

// A simple Playlist Card component for reuse
function PlaylistCard({ playlist, onViewPlaylist }) {
  return (
    <div className="playlist-card" onClick={() => onViewPlaylist(playlist)}>
      <div className="playlist-cover">
        {playlist.coverUrl ? <img src={`${getApiBase()}${playlist.coverUrl}`} alt={playlist.title} /> : <span className="cover-icon">🎵</span>}
      </div>
      <div className="playlist-info">
        <div className="playlist-title">{playlist.title}</div>
        <div className="tag-pills-card">
          {playlist.tags?.slice(0, 2).map(t => (
            <span key={t.text} className="tag-pill-card" style={{ backgroundColor: t.color }}>{t.text}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function UserProfilePage({ onViewPlaylist }) {
  const { username } = useParams(); // Get username from URL
  const [profile, setProfile] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfileData = async () => {
      setLoading(true);
      setError('');
      try {
        const [profileRes, playlistsRes] = await Promise.all([
          fetch(`${getApiBase()}/api/users/${username}`),
          fetch(`${getApiBase()}/api/users/${username}/playlists`),
        ]);

        if (!profileRes.ok) throw new Error('User not found.');
        
        setProfile(await profileRes.json());
        if (playlistsRes.ok) {
          setPlaylists(await playlistsRes.json());
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [username]);

  if (loading) return <div className="centered-container"><p>Loading profile...</p></div>;
  if (error) return <div className="centered-container"><p>{error}</p></div>;

  return (
    <div className="profile-page-container">
      <header className="profile-page-header">
        <div className="profile-avatar-large">
          {profile.avatarUrl && <img src={`${getApiBase()}${profile.avatarUrl}`} alt={profile.username} />}
        </div>
        <div className="profile-info">
          <h1 className="profile-fullname">{profile.firstName} {profile.lastName}</h1>
          <h2 className="profile-username">@{profile.username}</h2>
          <p className="profile-bio">{profile.bio || 'No bio yet.'}</p>
        </div>
        <div className="profile-actions">
          <button className="follow-btn">Follow</button>
        </div>
      </header>

      <main className="profile-playlists">
        <h3>Published Playlists</h3>
        <div className="home-playlist-grid">
          {playlists.length > 0 ? (
            playlists.map(pl => <PlaylistCard key={pl._id} playlist={pl} onViewPlaylist={onViewPlaylist} />)
          ) : (
            <p>{profile.username} hasn't published any playlists yet.</p>
          )}
        </div>
      </main>
    </div>
  );
}