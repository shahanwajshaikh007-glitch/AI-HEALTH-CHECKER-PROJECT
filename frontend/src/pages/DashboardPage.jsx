/**
 * DashboardPage.jsx — Interactive Main Application Workspace.
 * Integrates Home, Symptom Checker & Disease Prediction, AI Assistant Chat,
 * Assessment History, User Profile, and Admin Dashboard.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, LogOut, Stethoscope, Search, Mic, Brain, Clock, User,
  FileText, CheckCircle, AlertTriangle, Loader2, Download, Trash2, RefreshCw,
  ChevronRight, Shield, ShieldCheck, Sparkles, Send, MessageSquare
} from 'lucide-react';
import toast from 'react-hot-toast';

import BottomNav from '../components/BottomNav';
import VoiceInputButton from '../components/VoiceInputButton';
import EmergencyBanner from '../components/EmergencyBanner';

import { authService } from '../services/authService';
import { symptomService } from '../services/symptomService';
import { predictionService } from '../services/predictionService';
import { chatService } from '../services/chatService';
import { reportService } from '../services/reportService';
import { adminService } from '../services/adminService';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('home');
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));

  // ── 1. SYMPTOM CHECKER STATE ──────────────────────────────────────
  const [symptomText, setSymptomText] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [duration, setDuration] = useState('1-3 days');
  const [severity, setSeverity] = useState('Moderate');
  const [availableSymptoms, setAvailableSymptoms] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  // ── 2. AI CHAT STATE ──────────────────────────────────────────────
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // ── 3. HISTORY STATE ──────────────────────────────────────────────
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ── 4. PROFILE STATE ──────────────────────────────────────────────
  const [profileForm, setProfileForm] = useState({
    full_name: user.full_name || '',
    age: user.age || '',
    gender: user.gender || '',
    phone: user.phone || '',
    language: user.language || 'en'
  });
  const [profileUpdating, setProfileUpdating] = useState(false);

  // ── 5. ADMIN STATE ────────────────────────────────────────────────
  const [adminStats, setAdminStats] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [modelPerf, setModelPerf] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);

  // ── INITIAL DATA FETCHING ────────────────────────────────────────
  useEffect(() => {
    // Fetch available symptoms list for manual selector
    symptomService.getSymptoms()
      .then(res => setAvailableSymptoms(res.symptoms || []))
      .catch(() => {});

    // Fetch initial chat history
    chatService.getChatHistory()
      .then(res => setChatMessages(res.messages || []))
      .catch(() => {});

    // Fetch fresh profile
    authService.getProfile()
      .then(userData => {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        setProfileForm({
          full_name: userData.full_name || '',
          age: userData.age || '',
          gender: userData.gender || '',
          phone: userData.phone || '',
          language: userData.language || 'en'
        });
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          authService.logout();
          navigate('/login');
        }
      });
  }, []);

  // Fetch history when history tab is opened
  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  // Fetch admin stats when admin tab is opened
  useEffect(() => {
    if (activeTab === 'admin') {
      loadAdminData();
    }
  }, [activeTab]);

  function loadHistory() {
    setHistoryLoading(true);
    predictionService.getHistory()
      .then(res => setHistoryList(res.assessments || []))
      .catch(() => toast.error('Could not load assessment history.'))
      .finally(() => setHistoryLoading(false));
  }

  function loadAdminData() {
    setAdminLoading(true);
    Promise.all([
      adminService.getStatistics(),
      adminService.getUsers(),
      adminService.getModelPerformance()
    ])
      .then(([stats, usersData, perf]) => {
        setAdminStats(stats);
        setAdminUsers(usersData.users || []);
        setModelPerf(perf);
      })
      .catch(() => toast.error('Failed to load admin metrics.'))
      .finally(() => setAdminLoading(false));
  }

  function handleLogout() {
    authService.logout();
    toast.success('Logged out successfully.');
    navigate('/login');
  }

  // ── HANDLERS: SYMPTOM CHECKER & PREDICTION ──────────────────────
  function toggleSymptomSelection(name) {
    setSelectedSymptoms(prev =>
      prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]
    );
  }

  async function handleAnalyzeSymptoms(e) {
    if (e) e.preventDefault();

    if (!symptomText.trim() && selectedSymptoms.length === 0) {
      toast.error('Please enter symptoms text or select symptoms from the list.');
      return;
    }

    setAnalyzing(true);
    setPredictionResult(null);

    try {
      const payload = {
        symptoms: selectedSymptoms,
        raw_text: symptomText.trim(),
        duration,
        severity
      };

      const result = await predictionService.predictDisease(payload);
      setPredictionResult(result);
      toast.success('Symptom analysis completed!');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to analyze symptoms. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleGenerateReport(assessmentId) {
    if (!assessmentId) return;
    setGeneratingReport(true);
    try {
      const res = await reportService.generateReport(assessmentId);
      toast.success('PDF report generated successfully!');
      const downloadUrl = reportService.getReportDownloadUrl(res.report_id);
      window.open(downloadUrl, '_blank');
    } catch (err) {
      toast.error('Could not generate PDF report.');
    } finally {
      setGeneratingReport(false);
    }
  }

  // ── HANDLERS: AI CHAT ────────────────────────────────────────────
  async function handleSendChatMessage(e) {
    if (e) e.preventDefault();
    const text = chatInput.trim();
    if (!text || chatLoading) return;

    const tempUserMsg = { sender: 'user', message: text, id: Date.now().toString() };
    setChatMessages(prev => [...prev, tempUserMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const context = predictionResult ? `Top Prediction: ${predictionResult.top_prediction}, Symptoms: ${predictionResult.symptoms?.join(', ')}` : null;
      const res = await chatService.sendMessage(text, context);
      setChatMessages(prev => [...prev, { sender: 'ai', message: res.reply, id: Date.now().toString() }]);
    } catch (err) {
      toast.error('Failed to get response from AI Assistant.');
    } finally {
      setChatLoading(false);
    }
  }

  async function handleClearChat() {
    try {
      await chatService.clearChatHistory();
      setChatMessages([]);
      toast.success('Chat history cleared.');
    } catch (err) {
      toast.error('Could not clear chat.');
    }
  }

  // ── HANDLERS: PROFILE ────────────────────────────────────────────
  async function handleProfileUpdate(e) {
    e.preventDefault();
    setProfileUpdating(true);
    try {
      const payload = {
        full_name: profileForm.full_name.trim(),
        age: profileForm.age ? Number(profileForm.age) : null,
        gender: profileForm.gender,
        phone: profileForm.phone,
        language: profileForm.language
      };
      const res = await authService.updateProfile(payload);
      setUser(res.user);
      localStorage.setItem('user', JSON.stringify(res.user));
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update profile.');
    } finally {
      setProfileUpdating(false);
    }
  }

  // ── HANDLER: DELETE ASSESSMENT ──────────────────────────────────
  async function handleDeleteAssessment(id) {
    try {
      await predictionService.deleteAssessment(id);
      setHistoryList(prev => prev.filter(item => item.id !== id));
      toast.success('Assessment removed.');
    } catch (err) {
      toast.error('Failed to delete assessment.');
    }
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-16 md:pb-0">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('home')}>
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-slate-900 text-lg">
            AI<span className="text-blue-600">Health</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="font-medium text-xs">{user.full_name || 'User'}</span>
            {user.role === 'admin' && (
              <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">ADMIN</span>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-500 hover:text-red-500 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </header>

      {/* Interactive Bottom/Top Navigation */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} userRole={user.role} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">

        {/* ════════════════════ TAB 1: HOME OVERVIEW ════════════════════ */}
        {activeTab === 'home' && (
          <div className="space-y-8">
            {/* Welcome Card */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
              <div className="relative z-10 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold mb-4">
                  <Sparkles className="w-3.5 h-3.5" /> AI Health Assistant Ready
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold mb-3 leading-tight">
                  {greeting}, {user.full_name || 'User'}! 👋
                </h1>
                <p className="text-blue-100 text-sm sm:text-base leading-relaxed mb-6">
                  What would you like to check today? Use our smart AI symptom analyzer or chat directly with your virtual medical assistant.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setActiveTab('check')}
                    className="px-6 py-3 bg-white text-blue-700 font-bold rounded-xl hover:bg-blue-50 transition-colors shadow-md flex items-center gap-2 text-sm"
                  >
                    <Stethoscope className="w-4 h-4" /> Start Assessment
                  </button>
                  <button
                    onClick={() => setActiveTab('ai')}
                    className="px-6 py-3 bg-blue-500/40 border border-white/30 text-white font-semibold rounded-xl hover:bg-blue-500/60 transition-colors flex items-center gap-2 text-sm"
                  >
                    <Brain className="w-4 h-4" /> Ask AI Assistant
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Feature Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div
                onClick={() => setActiveTab('check')}
                className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-1">Check Symptoms</h3>
                <p className="text-slate-500 text-sm mb-4">Analyze text or voice symptoms with machine learning.</p>
                <span className="text-xs font-semibold text-blue-600 flex items-center gap-1 group-hover:underline">
                  Start Analysis <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>

              <div
                onClick={() => setActiveTab('check')}
                className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mb-4 group-hover:bg-red-600 group-hover:text-white transition-colors">
                  <Mic className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-1">Voice Input 🎤</h3>
                <p className="text-slate-500 text-sm mb-4">Speak naturally to describe your health symptoms.</p>
                <span className="text-xs font-semibold text-red-600 flex items-center gap-1 group-hover:underline">
                  Try Voice <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>

              <div
                onClick={() => setActiveTab('ai')}
                className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center mb-4 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                  <Brain className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-1">Ask AI Assistant</h3>
                <p className="text-slate-500 text-sm mb-4">Ask health questions and get instant recommendations.</p>
                <span className="text-xs font-semibold text-violet-600 flex items-center gap-1 group-hover:underline">
                  Open Chat <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>

              <div
                onClick={() => setActiveTab('history')}
                className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-1">Assessment History</h3>
                <p className="text-slate-500 text-sm mb-4">View your past symptom checks and health reports.</p>
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 group-hover:underline">
                  View History <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>

              <div
                onClick={() => setActiveTab('profile')}
                className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <User className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-1">My Profile</h3>
                <p className="text-slate-500 text-sm mb-4">Manage personal health profile information.</p>
                <span className="text-xs font-semibold text-amber-600 flex items-center gap-1 group-hover:underline">
                  Edit Profile <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════ TAB 2: SYMPTOM CHECKER & PREDICTION ════════════════════ */}
        {activeTab === 'check' && (
          <div className="space-y-8">
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Check Symptoms & Predict Disease</h2>
                  <p className="text-slate-500 text-xs mt-1">Describe symptoms in text, speak with voice mic, or pick from common symptoms.</p>
                </div>
                <VoiceInputButton
                  currentText={symptomText}
                  onTranscript={(text) => setSymptomText(text)}
                />
              </div>

              <form onSubmit={handleAnalyzeSymptoms} className="space-y-6">
                {/* Free Text Input */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Describe how you feel (Text or Voice)
                  </label>
                  <textarea
                    rows="3"
                    value={symptomText}
                    onChange={(e) => setSymptomText(e.target.value)}
                    placeholder="e.g. I have severe headache, mild fever, dry cough and tiredness since yesterday..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                  />
                </div>

                {/* Common Symptoms Selection Checkboxes */}
                {availableSymptoms.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Or select common symptoms:
                    </label>
                    <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto p-3 bg-slate-50 rounded-xl border border-slate-100">
                      {availableSymptoms.map(s => {
                        const isSelected = selectedSymptoms.includes(s.name);
                        return (
                          <button
                            type="button"
                            key={s.id}
                            onClick={() => toggleSymptomSelection(s.name)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
                            }`}
                          >
                            {isSelected ? '✓ ' : '+ '}{s.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Duration & Severity Selectors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Symptom Duration</label>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="1-3 days">1 to 3 days</option>
                      <option value="4-7 days">4 to 7 days</option>
                      <option value="1-2 weeks">1 to 2 weeks</option>
                      <option value="More than 2 weeks">More than 2 weeks</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Severity Level</label>
                    <select
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Mild">Mild</option>
                      <option value="Moderate">Moderate</option>
                      <option value="Severe">Severe</option>
                    </select>
                  </div>
                </div>

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={analyzing}
                  className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                >
                  {analyzing ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing symptoms...</>
                  ) : (
                    <><Activity className="w-5 h-5" /> Analyze Symptoms</>
                  )}
                </button>
              </form>
            </div>

            {/* PREDICTION RESULTS DISPLAY */}
            {predictionResult && (
              <div className="space-y-6">
                {/* Emergency Safety Alert Check */}
                {predictionResult.is_emergency && (
                  <EmergencyBanner warnings={predictionResult.emergency_warnings} />
                )}

                {/* Results Card */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-md">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                    <div>
                      <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Prediction Result</span>
                      <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{predictionResult.top_prediction}</h3>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-500">Confidence</span>
                      <div className="text-2xl font-black text-blue-600">{predictionResult.confidence}%</div>
                    </div>
                  </div>

                  {predictionResult.description && (
                    <p className="text-slate-600 text-sm mb-6 leading-relaxed bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                      ℹ️ {predictionResult.description}
                    </p>
                  )}

                  {/* Differential Diagnosis Top 3 Conditions */}
                  <h4 className="text-sm font-bold text-slate-900 mb-3">Top Possible Conditions</h4>
                  <div className="space-y-3 mb-6">
                    {predictionResult.top_3_conditions?.map((c, idx) => (
                      <div key={idx} className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                        <div className="flex items-center justify-between text-sm font-semibold text-slate-800 mb-1.5">
                          <span>#{idx + 1} {c.disease}</span>
                          <span className="text-blue-600 font-bold">{c.probability}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${c.probability}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Recommended Action / Advice */}
                  {predictionResult.advice && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-sm text-green-900">
                      <strong>Recommended Guidance:</strong>
                      <p className="mt-1">{predictionResult.advice}</p>
                    </div>
                  )}

                  {/* Generate Report Button */}
                  <button
                    onClick={() => handleGenerateReport(predictionResult.assessment_id)}
                    disabled={generatingReport}
                    className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2 shadow-md shadow-emerald-200"
                  >
                    {generatingReport ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Generating your report...</>
                    ) : (
                      <><FileText className="w-4 h-4" /> Generate PDF Report</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════ TAB 3: AI ASSISTANT CHAT ════════════════════ */}
        {activeTab === 'ai' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[70vh]">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">AI Medical Assistant</h3>
                  <p className="text-[11px] text-slate-400">Ask health questions and get instant medical info</p>
                </div>
              </div>
              <button
                onClick={handleClearChat}
                className="text-xs text-slate-400 hover:text-red-500 transition-colors"
              >
                Clear Chat
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {chatMessages.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-3">
                  <MessageSquare className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-sm">Start a conversation with your AI Medical Assistant.</p>
                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    {['How to manage fever?', 'What remedies help dry cough?', 'When to see a doctor for headache?'].map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => { setChatInput(q); }}
                        className="text-xs bg-slate-100 hover:bg-violet-50 hover:text-violet-600 px-3 py-1.5 rounded-full border border-slate-200 transition-colors"
                      >
                        "{q}"
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                chatMessages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        m.sender === 'user'
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : 'bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200'
                      }`}
                    >
                      <p className="whitespace-pre-line">{m.message}</p>
                    </div>
                  </div>
                ))
              )}

              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 text-slate-500 rounded-2xl px-4 py-2 text-xs flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> AI is thinking...
                  </div>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendChatMessage} className="p-3 border-t border-slate-100 flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask your health question..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <VoiceInputButton
                currentText={chatInput}
                onTranscript={(text) => setChatInput(text)}
                className="py-2.5 px-3 text-xs"
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="p-2.5 bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* ════════════════════ TAB 4: ASSESSMENT HISTORY ════════════════════ */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Assessment History</h2>
              <button
                onClick={loadHistory}
                className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            {historyLoading ? (
              <div className="text-center py-12 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                <span>Loading your assessments...</span>
              </div>
            ) : historyList.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center space-y-4">
                <Clock className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-lg font-bold text-slate-800">No assessments yet</h3>
                <p className="text-slate-500 text-sm">You haven't run any symptom checks yet.</p>
                <button
                  onClick={() => setActiveTab('check')}
                  className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors text-sm"
                >
                  Check Your Symptoms
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {historyList.map(item => (
                  <div key={item.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="text-xs text-slate-400">
                          {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recent'}
                        </span>
                        <h3 className="font-bold text-slate-900 text-lg">{item.top_prediction}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full">
                          {item.confidence}% Match
                        </span>
                        <button
                          onClick={() => handleDeleteAssessment(item.id)}
                          className="text-slate-400 hover:text-red-500 p-1 transition-colors"
                          title="Delete Assessment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 mb-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <strong>Symptoms:</strong> {item.symptoms?.join(', ') || item.raw_text}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-xs text-slate-400">Duration: {item.duration} | Severity: {item.severity}</span>
                      <button
                        onClick={() => handleGenerateReport(item.id)}
                        className="text-xs font-semibold text-emerald-600 hover:underline flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" /> Download Report
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════ TAB 5: USER PROFILE ════════════════════ */}
        {activeTab === 'profile' && (
          <div className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-100 p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">User Profile</h2>
            <p className="text-slate-500 text-xs mb-6">Manage your account information and preferences.</p>

            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={profileForm.full_name}
                  onChange={(e) => setProfileForm(p => ({ ...p, full_name: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  disabled
                  value={user.email || ''}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-100 text-slate-500 cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Age</label>
                  <input
                    type="number"
                    value={profileForm.age}
                    onChange={(e) => setProfileForm(p => ({ ...p, age: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                  <select
                    value={profileForm.gender}
                    onChange={(e) => setProfileForm(p => ({ ...p, gender: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={profileUpdating}
                className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2 mt-4"
              >
                {profileUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Profile'}
              </button>
            </form>
          </div>
        )}

        {/* ════════════════════ TAB 6: ADMIN DASHBOARD ════════════════════ */}
        {activeTab === 'admin' && (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-slate-900">Admin Dashboard</h2>

            {adminLoading ? (
              <div className="text-center py-12 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                <span>Loading system statistics...</span>
              </div>
            ) : (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-center">
                    <div className="text-2xl font-extrabold text-blue-600">{adminStats?.total_users || 0}</div>
                    <div className="text-xs text-slate-500 mt-1">Total Users</div>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-center">
                    <div className="text-2xl font-extrabold text-emerald-600">{adminStats?.total_assessments || 0}</div>
                    <div className="text-xs text-slate-500 mt-1">Assessments</div>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-center">
                    <div className="text-2xl font-extrabold text-violet-600">{adminStats?.total_symptoms || 0}</div>
                    <div className="text-xs text-slate-500 mt-1">Symptoms</div>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-center">
                    <div className="text-2xl font-extrabold text-red-600">{adminStats?.emergency_flagged_assessments || 0}</div>
                    <div className="text-xs text-slate-500 mt-1">Emergency Flags</div>
                  </div>
                </div>

                {/* Model Metrics */}
                {modelPerf && (
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="font-bold text-slate-900 text-md mb-4 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-blue-600" /> ML Model Performance ({modelPerf.model_name})
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                      <div className="bg-slate-50 p-3 rounded-xl">
                        <div className="text-lg font-bold text-slate-800">{(modelPerf.accuracy * 100).toFixed(1)}%</div>
                        <div className="text-[11px] text-slate-500">Accuracy</div>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl">
                        <div className="text-lg font-bold text-slate-800">{(modelPerf.precision * 100).toFixed(1)}%</div>
                        <div className="text-[11px] text-slate-500">Precision</div>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl">
                        <div className="text-lg font-bold text-slate-800">{(modelPerf.recall * 100).toFixed(1)}%</div>
                        <div className="text-[11px] text-slate-500">Recall</div>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl">
                        <div className="text-lg font-bold text-slate-800">{(modelPerf.f1_score * 100).toFixed(1)}%</div>
                        <div className="text-[11px] text-slate-500">F1-Score</div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
