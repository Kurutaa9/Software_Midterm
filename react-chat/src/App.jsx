import { useState, useEffect, useRef } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { collection, doc, addDoc, setDoc, getDoc, getDocs, onSnapshot, query, orderBy, serverTimestamp, updateDoc, arrayUnion, arrayRemove, deleteDoc, where } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { auth, db, storage } from "./firebase";
import "./index.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  if (isLoading) return <div style={{ color: "white", padding: 20 }}>Loading...</div>;

  return user ? <ChatApp user={user} /> : <AuthScreen />;
}

function AuthScreen() {
  const [tab, setTab] = useState("signin");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");

  const handleSubmit = async () => {
    setErr("");
    try {
      if (tab === "signin") {
        await signInWithEmailAndPassword(auth, email, pass);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        await setDoc(doc(db, "users", cred.user.uid), { email, uid: cred.user.uid, createdAt: serverTimestamp() });
      }
    } catch (e) {
      setErr(e.code || "An error occurred");
    }
  };

  return (
    <div id="auth-screen">
      <div className="auth-card">
        <h1>ChatterBogs 💬</h1>
        <p className="subtitle">Sign in to start chatting</p>
        <div className="tab-row">
          <button className={`tab-btn ${tab === "signin" ? "active" : ""}`} onClick={() => setTab("signin")}>Sign In</button>
          <button className={`tab-btn ${tab === "signup" ? "active" : ""}`} onClick={() => setTab("signup")}>Sign Up</button>
        </div>
        <div className="field">
          <label>Email</label>
          <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" placeholder="••••••••" value={pass} onChange={e => setPass(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={handleSubmit}>
          {tab === "signin" ? "Sign In" : "Create Account"}
        </button>
        <div className="auth-err">{err}</div>
      </div>
    </div>
  );
}

function ChatApp({ user }) {
  const [rooms, setRooms] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const activeRoom = rooms.find(r => r.id === activeRoomId) || null;
  const [messages, setMessages] = useState([]);
  const [newRoomModal, setNewRoomModal] = useState(false);
  const [inviteModal, setInviteModal] = useState(false);
  const [manageModal, setManageModal] = useState(false);
  const [profileModal, setProfileModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth <= 680);
  const [userProfile, setUserProfile] = useState({});

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setUserProfile(docSnap.data());
      }
    });
    return () => unsub();
  }, [user.uid]);

  useEffect(() => {
    const q = query(collection(db, "rooms"), where("members", "array-contains", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const roomList = docData(snap);
      setRooms(roomList);
    });
    return () => unsub();
  }, [user.uid]);

  useEffect(() => {
    if (!activeRoomId) return;
    const q = query(collection(db, "rooms", activeRoomId, "messages"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(docData(snap));
    });
    return () => unsub();
  }, [activeRoomId]);

  const selectRoom = (room) => {
    setActiveRoomId(room.id);
    setSidebarOpen(false);
  };

  return (
    <div id="app">
      <Sidebar 
        user={user} userProfile={userProfile} rooms={rooms} 
        activeRoom={activeRoom} selectRoom={selectRoom} 
        openNewRoom={() => setNewRoomModal(true)} 
        openProfile={() => setProfileModal(true)}
        isOpen={sidebarOpen} close={() => setSidebarOpen(false)} 
      />
      <ChatArea 
        activeRoom={activeRoom} user={user} userProfile={userProfile} messages={messages}
        openInvite={() => setInviteModal(true)} 
        openManage={() => setManageModal(true)}
        toggleSidebar={() => setSidebarOpen(true)} 
      />
      {newRoomModal && <NewRoomModal close={() => setNewRoomModal(false)} user={user} />}
      {inviteModal && activeRoom && <InviteModal close={() => setInviteModal(false)} activeRoom={activeRoom} />}
      {manageModal && activeRoom && <ManageRoomModal close={() => setManageModal(false)} activeRoom={activeRoom} user={user} setActiveRoomId={setActiveRoomId} />}
      {profileModal && <ProfileModal close={() => setProfileModal(false)} user={user} userProfile={userProfile} />}
    </div>
  );
}

function Sidebar({ user, userProfile, rooms, activeRoom, selectRoom, openNewRoom, openProfile, isOpen, close }) {
  const displayName = userProfile?.username || user.email;
  const initial = displayName?.[0]?.toUpperCase() || "?";
  
  return (
    <div className={`sidebar ${isOpen ? "open" : ""}`} id="sidebar">
      <div className="sidebar-header">
        <h2>ChatterBogs</h2>
        <button className="icon-btn" title="New Room" onClick={openNewRoom}>＋</button>
      </div>
      <div className="user-info" onClick={openProfile} style={{cursor:"pointer", hover:{background:"#eee"}}}>
        {userProfile?.profilePicture ? (
          <img src={userProfile.profilePicture} alt="Avatar" className="avatar" style={{width: 32, height: 32, borderRadius: "50%", objectFit: "cover", margin: 0}} />
        ) : (
          <div className="avatar" style={{background: colorFromEmail(user.email)}}>{initial}</div>
        )}
        <span className="user-email" style={{overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{displayName}</span>
        <button className="signout-btn" onClick={(e) => { e.stopPropagation(); signOut(auth); }}>Out</button>
      </div>
      <div className="rooms-list">
        {rooms.length === 0 ? <div className="no-rooms">No rooms yet.<br/>Create one!</div> : 
          rooms.map(r => (
            <div key={r.id} className={`room-item ${activeRoom?.id === r.id ? "active" : ""}`} onClick={() => selectRoom(r)}>
              <span className="room-icon">💬</span>
              <span className="room-name">{r.name}</span>
            </div>
          ))}
      </div>
      {isOpen && <div style={{position: 'absolute', top: 10, right: 10, zIndex: 100}} onClick={close}>❌</div>}
    </div>
  );
}

function ChatArea({ activeRoom, user, userProfile, messages, openInvite, openManage, toggleSidebar }) {
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [editingMsgId, setEditingMsgId] = useState(null);
  const endRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!text.trim() || !activeRoom) return;
    const msg = text.trim();
    setText("");
    
    if (editingMsgId) {
      await updateDoc(doc(db, "rooms", activeRoom.id, "messages", editingMsgId), { text: msg, isEdited: true });
      setEditingMsgId(null);
    } else {
      await addDoc(collection(db, "rooms", activeRoom.id, "messages"), {
        text: msg, senderUid: user.uid, senderEmail: user.email, 
        senderUsername: userProfile?.username || "", senderProfilePic: userProfile?.profilePicture || "",
        createdAt: serverTimestamp(), isImage: false
      });
    }
  };

  const unsend = async (msgId, isImage, imageUrl) => {
    if (!window.confirm("Unsend this message?")) return;
    // (If using base64 it deletes automatically with the doc)
    if (isImage && imageUrl && imageUrl.startsWith('http')) {
      try {
        const imageRef = ref(storage, imageUrl);
        await deleteObject(imageRef);
      } catch (e) {
        console.error("Failed to delete from storage", e);
      }
    }
    await deleteDoc(doc(db, "rooms", activeRoom.id, "messages", msgId));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeRoom) return;

    // We will convert the image to Base64 to bypass Firebase Storage setup completely
    const reader = new FileReader();
    reader.onerror = () => alert("Failed to read file.");
    reader.onload = function (event) {
      const img = new Image();
      img.onerror = () => alert("Your browser cannot process this image format. Try a smaller JPG or PNG.");
      img.onload = async function () {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 800; // Resize to ensure it fits in Firestore 1MB limits
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.6); // compress to base64 JPEG to fit in 1MB Firestore limit

        try {
          await addDoc(collection(db, "rooms", activeRoom.id, "messages"), {
            text: dataUrl, senderUid: user.uid, senderEmail: user.email, 
            senderUsername: userProfile?.username || "", senderProfilePic: userProfile?.profilePicture || "",
            createdAt: serverTimestamp(), isImage: true
          });
        } catch (error) {
          console.error("Image send failed:", error);
          alert("Image send failed: " + error.message);
        }
        
        // Reset after successful read so the same file can be uploaded again
        e.target.value = null;
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Filter messages
  const displayMessages = messages.filter(m => {
    const isImgMsg = m.isImage || (typeof m.text === 'string' && m.text.startsWith('data:image'));
    return search ? (m.text && m.text.toLowerCase().includes(search.toLowerCase()) && !isImgMsg) : true;
  });

  return (
    <div className="chat-area">
      <div className="chat-header">
        <div style={{display:"flex", alignItems:"center", gap: 10}}>
          <button className="icon-btn" id="menu-toggle" onClick={toggleSidebar}>
            {activeRoom ? "←" : "☰"}
          </button>
          <div className="chat-header-info">
            <h3>{activeRoom ? activeRoom.name : "Select a room"}</h3>
            <span>{activeRoom ? `${activeRoom.members.length} members` : "—"}</span>
          </div>
        </div>
        {activeRoom && (
          <div className="header-actions">
            <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{padding:"5px 10px", borderRadius: 10, border: "1px solid var(--border)", background:"var(--surface2)", color:"var(--text)"}} />
            <button className="icon-btn" title="Manage Room" onClick={openManage}>⚙️</button>
            <button className="icon-btn" title="Invite Member" onClick={openInvite}>👤+</button>
          </div>
        )}
      </div>

      <div className="messages-wrap">
        {!activeRoom ? (
          <div className="empty-chat">
            <div className="big-icon">💬</div>
            <p>Pick a room from the sidebar<br/>or create a new one to start chatting.</p>
          </div>
        ) : displayMessages.map((m, idx) => {
          const isMe = m.senderUid === user.uid;
          const time = m.createdAt?.toDate ? m.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
          const senderDisplay = m.senderUsername || m.senderEmail;
          const initial = senderDisplay?.[0]?.toUpperCase() || "?";
          return (
            <div key={m.id || idx} className={`msg ${isMe ? 'me' : ''}`}>
              {m.senderProfilePic ? (
                <img src={m.senderProfilePic} alt="avatar" className="msg-avatar" style={{width: 32, height: 32, borderRadius: "50%", objectFit: "cover", background: "none", color: "transparent"}} />
              ) : (
                <div className="msg-avatar" style={{background: colorFromEmail(m.senderEmail)}}>{initial}</div>
              )}
              <div className="msg-body">
                {!isMe && <span className="msg-sender">{senderDisplay}</span>}
                <div className="bubble" style={{wordBreak: "break-all"}}>
                  {(m.isImage || (typeof m.text === 'string' && (m.text.startsWith('data:image') || m.text.includes('base64,')))) ? <img src={m.text} alt="img" style={{maxWidth:"100%", borderRadius:8, display:"block"}} /> : m.text}
                  {m.isEdited && <span style={{fontSize: "0.6rem", marginLeft: 5, color:"var(--muted)"}}>(edited)</span>}
                </div>
                <div style={{display:"flex", justifyContent: isMe ? "flex-end" : "flex-start", gap: 4, alignItems: "center"}}>
                  {isMe && <span style={{fontSize:"0.65rem", cursor:"pointer", color:"var(--danger)"}} onClick={()=>unsend(m.id, m.isImage || (typeof m.text === 'string' && m.text.startsWith('data:image')), m.text)}>Unsend</span>}
                  {isMe && !(m.isImage || (typeof m.text === 'string' && m.text.startsWith('data:image'))) && <span style={{fontSize:"0.65rem", cursor:"pointer", color:"var(--accent)"}} onClick={()=>{setEditingMsgId(m.id); setText(m.text);}}>Edit</span>}
                  <span className="msg-time">{time}</span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {activeRoom && (
        <div className="input-row">
          <input id="image-upload" type="file" accept="image/*" style={{display:"none"}} onChange={handleImageUpload} />
          <label htmlFor="image-upload" className="icon-btn" title="Send Image" style={{marginRight: 5, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center"}}>🖼️</label>
          
          <textarea 
            className="msg-input" rows="1" placeholder={editingMsgId ? "Edit your message..." : "Type a message…"} 
            value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          />
          {editingMsgId && <button className="icon-btn" style={{marginRight: 5}} onClick={()=>{setEditingMsgId(null); setText("")}}>❌</button>}
          <button className="send-btn" onClick={send}>➤</button>
        </div>
      )}
    </div>
  );
}

function NewRoomModal({ close, user }) {
  const [name, setName] = useState("");
  const create = async () => {
    if(!name.trim()) return;
    await addDoc(collection(db, "rooms"), {
      name: name.trim(), members: [user.uid], admins: [user.uid], createdBy: user.uid, createdAt: serverTimestamp()
    });
    close();
  };
  return (
    <div className="modal-overlay" onClick={(e) => { if(e.target === e.currentTarget) close()}}>
      <div className="modal">
        <h3>Create New Room</h3>
        <div className="field"><label>Room Name</label><input autoFocus type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Study Group" /></div>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={close}>Cancel</button>
          <button className="btn-primary" style={{flex:1}} onClick={create}>Create</button>
        </div>
      </div>
    </div>
  );
}

function InviteModal({ close, activeRoom }) {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  
  const invite = async () => {
    setErr("");
    const q = query(collection(db, "users"), where("email", "==", email.trim()));
    const snap = await getDocs(q);
    if(snap.empty) return setErr("No user found with that email.");
    
    await updateDoc(doc(db, "rooms", activeRoom.id), { members: arrayUnion(snap.docs[0].id) });
    close();
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if(e.target === e.currentTarget) close()}}>
      <div className="modal">
        <h3>Invite to Room</h3>
        <div className="field"><label>Member Email</label><input autoFocus type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="friend@email.com" /></div>
        <div className="modal-err">{err}</div>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={close}>Cancel</button>
          <button className="btn-primary" style={{flex:1}} onClick={invite}>Invite</button>
        </div>
      </div>
    </div>
  );
}

// Utils
function docData(snap) { return snap.docs.map(d => ({ id: d.id, ...d.data() })); }
function colorFromEmail(email) {
  const colors = ['#5b7fff','#ff6b9d','#ffa94d','#69db7c','#74c0fc','#da77f2','#f783ac'];
  let h = 0; for (let i = 0; i < (email||'').length; i++) h = (h * 31 + email.charCodeAt(i)) % colors.length;
  return colors[h];
}

function ProfileModal({ close, user, userProfile }) {
  const [profilePicture, setProfilePicture] = useState(userProfile?.profilePicture || "");
  const [username, setUsername] = useState(userProfile?.username || "");
  const [email, setEmail] = useState(userProfile?.email || user.email || "");
  const [phone, setPhone] = useState(userProfile?.phone || "");
  const [address, setAddress] = useState(userProfile?.address || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "users", user.uid), {
        profilePicture, username, email, phone, address
      }, { merge: true });
      close();
    } catch (e) {
      alert("Failed to save profile: " + e.message);
      setSaving(false);
    }
  };

  const handlePicUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onerror = () => alert("Failed to read file.");
    reader.onload = function(event) {
      const img = new Image();
      img.onerror = () => alert("Your browser cannot process this image format. Try a smaller JPG or PNG.");
      img.onload = function() {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 400; // Profile pics can be much smaller
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
        } else {
          if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
        }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        setProfilePicture(canvas.toDataURL("image/jpeg", 0.6));
        e.target.value = null;
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if(e.target === e.currentTarget) close()}}>
      <div className="modal" style={{maxWidth: 400}}>
        <h3>Edit Profile</h3>
        <div style={{display: "flex", justifyContent: "center", marginBottom: 15, position: "relative"}}>
          <label style={{cursor:"pointer", display: "inline-block", position:"relative"}}>
            {profilePicture ? (
              <img src={profilePicture} alt="Avatar" style={{width: 80, height: 80, borderRadius: "50%", objectFit: "cover"}} />
            ) : (
                <div style={{width: 80, height: 80, borderRadius: "50%", background: colorFromEmail(user.email), display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 32}}>
                  {(username || user.email)?.[0]?.toUpperCase() || "?"}
                </div>
            )}
            <div style={{position:"absolute", bottom: 0, right: 0, background:"var(--accent)", color:"white", borderRadius:"50%", padding: 6, fontSize: "0.8rem", width: 24, height: 24, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 4px rgba(0,0,0,0.3)"}}>📷</div>
            <input type="file" accept="image/*" style={{display:"none"}} onChange={handlePicUpload} />
          </label>
        </div>
        <div className="field"><label>Username</label><input type="text" value={username} onChange={e=>setUsername(e.target.value)} /></div>
        <div className="field"><label>Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} /></div>
        <div className="field"><label>Phone Number</label><input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} /></div>
        <div className="field"><label>Address</label><input type="text" value={address} onChange={e=>setAddress(e.target.value)} /></div>
        <div className="modal-actions" style={{marginTop: 20}}>
          <button className="btn-secondary" onClick={close}>Cancel</button>
          <button className="btn-primary" style={{flex:1}} onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Profile"}</button>
        </div>
      </div>
    </div>
  );
}

function ManageRoomModal({ close, activeRoom, user, setActiveRoomId }) {
  const [membersInfo, setMembersInfo] = useState([]);
  const isAdmin = activeRoom.admins?.includes(user.uid) || activeRoom.createdBy === user.uid;

  useEffect(() => {
    const fetchMembers = async () => {
      const list = [];
      for (let uid of activeRoom.members) {
        try {
          const d = await getDoc(doc(db, "users", uid));
          list.push({ uid, email: d.data()?.email || uid });
        } catch (e) {
          list.push({ uid, email: uid });
        }
      }
      setMembersInfo(list);
    };
    fetchMembers();
  }, [activeRoom.members]);

  const kick = async (uid) => {
    if(!window.confirm("Kick this user?")) return;
    await updateDoc(doc(db, "rooms", activeRoom.id), {
      members: arrayRemove(uid),
      admins: arrayRemove(uid)
    });
  };

  const makeAdmin = async (uid) => {
    if(!window.confirm("Make this user an admin?")) return;
    await updateDoc(doc(db, "rooms", activeRoom.id), {
      admins: arrayUnion(uid)
    });
  };

  const delRoom = async () => {
    if(!window.confirm("Are you sure you want to permanently delete this room?")) return;
    await deleteDoc(doc(db, "rooms", activeRoom.id));
    setActiveRoomId(null);
    close();
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if(e.target === e.currentTarget) close()}}>
      <div className="modal">
        <h3>Manage Room</h3>
        <div className="members-list" style={{marginBottom: 20, maxHeight: 200}}>
          {membersInfo.map(m => {
            const isUserAdmin = activeRoom.admins?.includes(m.uid) || activeRoom.createdBy === m.uid;
            return (
              <div key={m.uid} className="member-item" style={{justifyContent: "space-between"}}>
                <div style={{display:"flex", alignItems:"center", gap:8}}>
                  <div className="avatar" style={{background: colorFromEmail(m.email)}}>{m.email?.[0]?.toUpperCase()||'?'}</div>
                  <div style={{display:"flex", flexDirection:"column"}}>
                    <span>{m.email} {m.uid === user.uid ? "(You)" : ""}</span>
                    {isUserAdmin && <span style={{fontSize:"0.7rem", color:"var(--accent)"}}>Admin</span>}
                  </div>
                </div>
                {isAdmin && m.uid !== user.uid && (
                  <div style={{display:"flex", gap: 5}}>
                    {!isUserAdmin && <button className="signout-btn" onClick={()=>makeAdmin(m.uid)}>+Admin</button>}
                    <button className="signout-btn" style={{borderColor:"var(--danger)", color:"var(--danger)"}} onClick={()=>kick(m.uid)}>Kick</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        {isAdmin && <button className="btn-primary" style={{background:"var(--danger)", marginBottom: 10}} onClick={delRoom}>Delete Room</button>}
        <button className="btn-secondary" style={{width:"100%"}} onClick={close}>Close</button>
      </div>
    </div>
  );
}
