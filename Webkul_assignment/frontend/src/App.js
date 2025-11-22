import { useState, useEffect } from "react";
import "@/App.css";
import axios from "axios";
import { ThumbsUp, ThumbsDown, Trash2, Edit2, Camera, Plus, X, User, Mail, Calendar, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [currentView, setCurrentView] = useState("landing"); // landing, signup, login, profile
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(false);

  // Form states
  const [signupData, setSignupData] = useState({
    full_name: "",
    email: "",
    password: "",
    date_of_birth: ""
  });
  
  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  });

  // Profile states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editData, setEditData] = useState({});
  const [posts, setPosts] = useState([]);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPost, setNewPost] = useState({ description: "", image: null });

  useEffect(() => {
    if (token) {
      fetchProfile();
    }
  }, [token]);

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${API}/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
      setCurrentView("profile");
      fetchPosts();
    } catch (error) {
      console.error("Error fetching profile:", error);
      if (error.response?.status === 401) {
        handleLogout();
      }
    }
  };

  const fetchPosts = async () => {
    try {
      const response = await axios.get(`${API}/posts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPosts(response.data);
    } catch (error) {
      console.error("Error fetching posts:", error);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/signup`, signupData);
      setToken(response.data.token);
      localStorage.setItem("token", response.data.token);
      setUser(response.data.user);
      toast.success("Account created successfully!");
      setCurrentView("profile");
      fetchPosts();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/login`, loginData);
      setToken(response.data.token);
      localStorage.setItem("token", response.data.token);
      setUser(response.data.user);
      toast.success("Welcome back!");
      setCurrentView("profile");
      fetchPosts();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    setCurrentView("landing");
    setPosts([]);
    toast.success("Logged out successfully");
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      if (editData.full_name) formData.append("full_name", editData.full_name);
      if (editData.date_of_birth) formData.append("date_of_birth", editData.date_of_birth);
      if (editData.profile_picture) formData.append("profile_picture", editData.profile_picture);

      const response = await axios.patch(`${API}/profile`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });
      setUser(response.data);
      setIsEditingProfile(false);
      setEditData({});
      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("description", newPost.description);
      if (newPost.image) formData.append("image", newPost.image);

      const response = await axios.post(`${API}/posts`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });
      setPosts([response.data, ...posts]);
      setShowCreatePost(false);
      setNewPost({ description: "", image: null });
      toast.success("Post created successfully!");
    } catch (error) {
      toast.error("Failed to create post");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      await axios.delete(`${API}/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPosts(posts.filter(p => p.id !== postId));
      toast.success("Post deleted");
    } catch (error) {
      toast.error("Failed to delete post");
    }
  };

  const handleReaction = async (postId, reactionType) => {
    try {
      const response = await axios.post(
        `${API}/posts/${postId}/react`,
        { reaction_type: reactionType },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setPosts(posts.map(post => 
        post.id === postId 
          ? { 
              ...post, 
              likes_count: response.data.likes_count,
              dislikes_count: response.data.dislikes_count,
              user_reaction: response.data.user_reaction
            }
          : post
      ));
    } catch (error) {
      toast.error("Failed to react to post");
    }
  };

  // Landing Page
  if (currentView === "landing") {
    return (
      <div className="landing-page">
        <div className="landing-content">
          <div className="hero-section">
            <h1 className="hero-title" data-testid="landing-title">Connect. Share. Inspire.</h1>
            <p className="hero-subtitle" data-testid="landing-subtitle">Join our community and share your moments with the world</p>
            <div className="hero-buttons">
              <Button data-testid="get-started-btn" onClick={() => setCurrentView("signup")} className="primary-btn">
                Get Started
              </Button>
              <Button data-testid="login-btn" onClick={() => setCurrentView("login")} className="secondary-btn">
                Login
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Signup Page
  if (currentView === "signup") {
    return (
      <div className="auth-page">
        <Card className="auth-card" data-testid="signup-form">
          <CardContent className="auth-card-content">
            <h2 className="auth-title" data-testid="signup-title">Create Account</h2>
            <form onSubmit={handleSignup}>
              <div className="form-group">
                <label>Full Name</label>
                <Input
                  data-testid="signup-fullname-input"
                  type="text"
                  required
                  value={signupData.full_name}
                  onChange={(e) => setSignupData({...signupData, full_name: e.target.value})}
                  placeholder="John Doe"
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <Input
                  data-testid="signup-email-input"
                  type="email"
                  required
                  value={signupData.email}
                  onChange={(e) => setSignupData({...signupData, email: e.target.value})}
                  placeholder="john@example.com"
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <Input
                  data-testid="signup-password-input"
                  type="password"
                  required
                  value={signupData.password}
                  onChange={(e) => setSignupData({...signupData, password: e.target.value})}
                  placeholder="••••••••"
                />
              </div>
              <div className="form-group">
                <label>Date of Birth</label>
                <Input
                  data-testid="signup-dob-input"
                  type="date"
                  required
                  value={signupData.date_of_birth}
                  onChange={(e) => setSignupData({...signupData, date_of_birth: e.target.value})}
                />
              </div>
              <Button data-testid="signup-submit-btn" type="submit" disabled={loading} className="submit-btn">
                {loading ? "Creating..." : "Sign Up"}
              </Button>
            </form>
            <p className="auth-switch">
              Already have an account? <span data-testid="switch-to-login" onClick={() => setCurrentView("login")}>Login</span>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Login Page
  if (currentView === "login") {
    return (
      <div className="auth-page">
        <Card className="auth-card" data-testid="login-form">
          <CardContent className="auth-card-content">
            <h2 className="auth-title" data-testid="login-title">Welcome Back</h2>
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>Email</label>
                <Input
                  data-testid="login-email-input"
                  type="email"
                  required
                  value={loginData.email}
                  onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                  placeholder="john@example.com"
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <Input
                  data-testid="login-password-input"
                  type="password"
                  required
                  value={loginData.password}
                  onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                  placeholder="••••••••"
                />
              </div>
              <Button data-testid="login-submit-btn" type="submit" disabled={loading} className="submit-btn">
                {loading ? "Logging in..." : "Login"}
              </Button>
            </form>
            <p className="auth-switch">
              Don't have an account? <span data-testid="switch-to-signup" onClick={() => setCurrentView("signup")}>Sign Up</span>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Profile Page
  return (
    <div className="profile-page" data-testid="profile-page">
      <div className="profile-header">
        <h1 className="profile-header-title" data-testid="profile-header-title">My Profile</h1>
        <Button data-testid="logout-btn" onClick={handleLogout} className="logout-btn">
          <LogOut size={18} /> Logout
        </Button>
      </div>

      <div className="profile-container">
        {/* Profile Info Section */}
        <Card className="profile-card" data-testid="profile-info-card">
          <CardContent className="profile-card-content">
            <div className="profile-picture-section">
              <div className="profile-picture" data-testid="profile-picture">
                {user?.profile_picture ? (
                  <img src={user.profile_picture} alt="Profile" />
                ) : (
                  <User size={80} />
                )}
              </div>
              {isEditingProfile && (
                <label className="upload-picture-btn" data-testid="upload-picture-btn">
                  <Camera size={20} />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setEditData({...editData, profile_picture: e.target.files[0]})}
                    hidden
                  />
                </label>
              )}
            </div>

            {!isEditingProfile ? (
              <div className="profile-info">
                <div className="profile-info-item" data-testid="profile-name">
                  <User size={18} />
                  <span>{user?.full_name}</span>
                  <Edit2 
                    data-testid="edit-profile-btn"
                    size={16} 
                    className="edit-icon" 
                    onClick={() => {
                      setIsEditingProfile(true);
                      setEditData({
                        full_name: user.full_name,
                        date_of_birth: user.date_of_birth
                      });
                    }} 
                  />
                </div>
                <div className="profile-info-item" data-testid="profile-email">
                  <Mail size={18} />
                  <span>{user?.email}</span>
                </div>
                <div className="profile-info-item" data-testid="profile-dob">
                  <Calendar size={18} />
                  <span>{user?.date_of_birth}</span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUpdateProfile} className="edit-profile-form">
                <div className="form-group">
                  <label>Full Name</label>
                  <Input
                    data-testid="edit-fullname-input"
                    type="text"
                    value={editData.full_name}
                    onChange={(e) => setEditData({...editData, full_name: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Date of Birth</label>
                  <Input
                    data-testid="edit-dob-input"
                    type="date"
                    value={editData.date_of_birth}
                    onChange={(e) => setEditData({...editData, date_of_birth: e.target.value})}
                  />
                </div>
                <div className="form-buttons">
                  <Button data-testid="save-profile-btn" type="submit" disabled={loading}>
                    Save Changes
                  </Button>
                  <Button 
                    data-testid="cancel-edit-btn"
                    type="button" 
                    onClick={() => {
                      setIsEditingProfile(false);
                      setEditData({});
                    }}
                    className="cancel-btn"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Posts Section */}
        <div className="posts-section">
          <div className="posts-header">
            <h2 data-testid="posts-title">My Posts</h2>
            <Button data-testid="create-post-btn" onClick={() => setShowCreatePost(!showCreatePost)} className="create-post-btn">
              <Plus size={18} /> Create Post
            </Button>
          </div>

          {/* Create Post Form */}
          {showCreatePost && (
            <Card className="create-post-card" data-testid="create-post-form">
              <CardContent className="create-post-content">
                <div className="create-post-header">
                  <h3>Create New Post</h3>
                  <X size={20} onClick={() => setShowCreatePost(false)} className="close-icon" />
                </div>
                <form onSubmit={handleCreatePost}>
                  <Textarea
                    data-testid="post-description-input"
                    placeholder="What's on your mind?"
                    value={newPost.description}
                    onChange={(e) => setNewPost({...newPost, description: e.target.value})}
                    required
                    rows={4}
                  />
                  <label className="image-upload-label" data-testid="post-image-upload-label">
                    <Camera size={20} />
                    <span>{newPost.image ? newPost.image.name : "Add Image"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setNewPost({...newPost, image: e.target.files[0]})}
                      hidden
                    />
                  </label>
                  <Button data-testid="submit-post-btn" type="submit" disabled={loading} className="submit-post-btn">
                    {loading ? "Posting..." : "Post"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Posts List */}
          <div className="posts-list" data-testid="posts-list">
            {posts.length === 0 ? (
              <div className="no-posts" data-testid="no-posts">No posts yet. Create your first post!</div>
            ) : (
              posts.map((post) => (
                <Card key={post.id} className="post-card" data-testid={`post-${post.id}`}>
                  <CardContent className="post-content">
                    <div className="post-header">
                      <div className="post-user-info">
                        <User size={24} />
                        <div>
                          <div className="post-user-name" data-testid={`post-username-${post.id}`}>{post.user_name}</div>
                          <div className="post-date">{new Date(post.created_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <Trash2 
                        data-testid={`delete-post-${post.id}`}
                        size={18} 
                        className="delete-icon" 
                        onClick={() => handleDeletePost(post.id)} 
                      />
                    </div>
                    
                    {post.image && (
                      <img src={post.image} alt="Post" className="post-image" data-testid={`post-image-${post.id}`} />
                    )}
                    
                    <p className="post-description" data-testid={`post-description-${post.id}`}>{post.description}</p>
                    
                    <div className="post-actions">
                      <button
                        data-testid={`like-btn-${post.id}`}
                        className={`reaction-btn ${post.user_reaction === 'like' ? 'active' : ''}`}
                        onClick={() => handleReaction(post.id, 'like')}
                      >
                        <ThumbsUp size={18} />
                        <span data-testid={`likes-count-${post.id}`}>{post.likes_count}</span>
                      </button>
                      <button
                        data-testid={`dislike-btn-${post.id}`}
                        className={`reaction-btn ${post.user_reaction === 'dislike' ? 'active' : ''}`}
                        onClick={() => handleReaction(post.id, 'dislike')}
                      >
                        <ThumbsDown size={18} />
                        <span data-testid={`dislikes-count-${post.id}`}>{post.dislikes_count}</span>
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;