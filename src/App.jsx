import React, { useState, useEffect } from 'react';
import {
  Search, Plus, UserPlus, Phone, Calendar, Scissors, Camera,
  ChevronLeft, Check, Trash2, Edit2, ExternalLink, Clock,
  Sparkles, CheckCircle2, TrendingUp, Users, Image as ImageIcon,
  AlertCircle, X, CheckSquare, Settings, UserCheck, HelpCircle, ArrowRight,
  CalendarDays, CheckCircle, LogOut, Lock, Mail, Store, User, ShieldAlert,
  Sliders, BarChart3, LockKeyhole
} from 'lucide-react';
import { db } from './db';
import imageCompression from 'browser-image-compression';

export default function App() {
  const getTodayStr = () => new Date().toISOString().split('T')[0];

  // Auth States
  const [currentUser, setCurrentUser] = useState(() => JSON.parse(localStorage.getItem('barbermemo_user') || 'null'));
  const [authForm, setAuthForm] = useState({ email: '', senha: '' });
  const [authError, setAuthError] = useState('');

  // App Navigation States (Barbers)
  const [currentView, setCurrentView] = useState('dashboard'); // dashboard | client-profile | new-client | new-attendance | edit-client | agenda | new-appointment
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [cameFromAppointment, setCameFromAppointment] = useState(false);

  // Desktop specific layout states (Barbers)
  const [sidebarTab, setSidebarTab] = useState('clientes'); // clientes | agenda

  // Admin Navigation States
  const [adminTab, setAdminTab] = useState('barbeiros'); // barbeiros | metrics
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [editingBarberId, setEditingBarberId] = useState(null);
  const [adminBarberForm, setAdminBarberForm] = useState({ nome: '', email: '', senha: '', barbeariaName: '' });
  const [adminError, setAdminError] = useState('');

  // Database states
  const [clientes, setClientes] = useState([]);
  const [proximosRetornos, setProximosRetornos] = useState([]);
  const [agendamentos, setAgendamentos] = useState([]);
  const [stats, setStats] = useState({ totalClientes: 0, totalAtendimentos: 0, atendimentosMes: 0 });

  // Admin Database states
  const [barbeirosList, setBarbeirosList] = useState([]);
  const [adminGlobalStats, setAdminGlobalStats] = useState({ totalBarbeiros: 0, totalClientes: 0, totalAtendimentos: 0, totalAgendamentos: 0 });

  // Form states
  const [clientForm, setClientForm] = useState({ nome: '', telefone: '', intervaloDiasRetorno: 20 });
  const [attendanceForm, setAttendanceForm] = useState({ laterais: '', topo: '', barba: '', produtos: '' });
  const [appointmentForm, setAppointmentForm] = useState({ clienteId: '', data: getTodayStr(), hora: '09:00', servicos: 'Corte' });
  const [appFormSearch, setAppFormSearch] = useState('');

  // Image upload state
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);

  // Load database content on init & update
  const refreshData = () => {
    if (!currentUser) return;
    if (currentUser.role === 'admin') {
      setBarbeirosList(db.adminGetBarbeiros());
      setAdminGlobalStats(db.adminGetGlobalStats());
    } else {
      setClientes(db.getClientes(currentUser.id, searchQuery));
      setProximosRetornos(db.getProximosRetornos(currentUser.id));
      setStats(db.getStats(currentUser.id));
      setAgendamentos(db.getAgendamentos(currentUser.id, selectedDate));
    }
  };

  useEffect(() => {
    if (currentUser) {
      refreshData();
    }
  }, [searchQuery, selectedDate, currentUser]);

  // Auth Form Handlers
  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setAuthError('');
    if (!authForm.email || !authForm.senha) {
      setAuthError('Por favor, preencha todos os campos.');
      return;
    }

    const session = db.login(authForm.email, authForm.senha);
    if (session) {
      setCurrentUser(session);
      localStorage.setItem('barbermemo_user', JSON.stringify(session));
      setAuthForm({ email: '', senha: '' });
      setAdminTab('barbeiros'); // reset admin tab on login
    } else {
      setAuthError('E-mail ou senha incorretos.');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('barbermemo_user');
    setSelectedClientId(null);
    setSearchQuery('');
    setCurrentView('dashboard');
    setSidebarTab('clientes');
  };

  // Admin CRUD Actions
  const handleAdminSaveBarber = (e) => {
    e.preventDefault();
    setAdminError('');
    if (!adminBarberForm.nome.trim() || !adminBarberForm.email.trim() || !adminBarberForm.senha.trim() || !adminBarberForm.barbeariaName.trim()) {
      setAdminError('Preencha todos os campos obrigatórios.');
      return;
    }

    try {
      if (editingBarberId) {
        db.adminUpdateBarbeiro(editingBarberId, adminBarberForm);
      } else {
        db.adminAddBarbeiro(adminBarberForm);
      }
      // Reset Form
      setAdminBarberForm({ nome: '', email: '', senha: '', barbeariaName: '' });
      setEditingBarberId(null);
      setShowAdminForm(false);
      refreshData();
    } catch (err) {
      setAdminError(err.message);
    }
  };

  const handleAdminEditClick = (barber) => {
    setAdminBarberForm({
      nome: barber.nome,
      email: barber.email,
      senha: barber.senha,
      barbeariaName: barber.barbeariaName
    });
    setEditingBarberId(barber.id);
    setShowAdminForm(true);
  };

  const handleAdminDeleteClick = (id) => {
    if (confirm("ATENÇÃO: Deletar este barbeiro excluirá permanentemente todos os clientes cadastrados por ele, suas fichas de cortes, fotos e agendamentos. Deseja prosseguir?")) {
      db.adminDeleteBarbeiro(id);
      refreshData();
    }
  };

  // Form submit handlers (Barbers)
  const handleSaveClient = (e) => {
    e.preventDefault();
    if (!clientForm.nome.trim() || !clientForm.telefone.trim()) {
      alert("Por favor, preencha o nome e o WhatsApp do cliente.");
      return;
    }
    const newCli = db.addCliente(currentUser.id, clientForm);
    setClientForm({ nome: '', telefone: '', intervaloDiasRetorno: 20 });
    refreshData();

    if (cameFromAppointment) {
      setAppointmentForm(prev => ({ ...prev, clienteId: newCli.id }));
      setAppFormSearch(newCli.nome);
      setCameFromAppointment(false);
      setCurrentView('new-appointment');
    } else {
      setSelectedClientId(newCli.id);
      setCurrentView('client-profile');
    }
  };

  const handleUpdateClient = (e) => {
    e.preventDefault();
    if (!clientForm.nome.trim() || !clientForm.telefone.trim()) {
      alert("Por favor, preencha o nome e o WhatsApp.");
      return;
    }
    db.updateCliente(currentUser.id, selectedClientId, clientForm);
    setCurrentView('client-profile');
    refreshData();
  };

  const handleDeleteClient = (id) => {
    if (confirm("Tem certeza que deseja excluir este cliente e todo o histórico dele? Esta ação é irreversível.")) {
      db.deleteCliente(currentUser.id, id);
      setSelectedClientId(null);
      setCurrentView('dashboard');
      refreshData();
    }
  };

  const handleSaveAttendance = (e) => {
    e.preventDefault();
    db.addAtendimento(currentUser.id, {
      clienteId: selectedClientId,
      laterais: attendanceForm.laterais,
      topo: attendanceForm.topo,
      barba: attendanceForm.barba,
      produtos: attendanceForm.produtos,
      fotos: selectedPhotos
    });

    // Reset forms
    setAttendanceForm({ laterais: '', topo: '', barba: '', produtos: '' });
    setSelectedPhotos([]);
    setCurrentView('client-profile');
    refreshData();
  };

  // Scheduling Form Submit Handler
  const handleSaveAppointment = (e) => {
    e.preventDefault();
    if (!appointmentForm.clienteId) {
      alert("Por favor, selecione um cliente.");
      return;
    }
    if (!appointmentForm.data || !appointmentForm.hora) {
      alert("Por favor, forneça data e hora válidas.");
      return;
    }

    const datetimeStr = `${appointmentForm.data}T${appointmentForm.hora}:00`;
    db.addAgendamento(currentUser.id, {
      clienteId: appointmentForm.clienteId,
      dataHora: new Date(datetimeStr).toISOString(),
      servicos: appointmentForm.servicos
    });

    // Reset
    setAppointmentForm({ clienteId: '', data: getTodayStr(), hora: '09:00', servicos: 'Corte' });
    setAppFormSearch('');

    // Redirect to agenda
    setCurrentView('agenda');
    setSidebarTab('agenda');
    refreshData();
  };

  const handleToggleAppointmentStatus = (id, newStatus) => {
    db.updateAgendamentoStatus(currentUser.id, id, newStatus);
    refreshData();
  };

  const handleDeleteAppointment = (id) => {
    if (confirm("Deseja cancelar/excluir este agendamento?")) {
      db.deleteAgendamento(currentUser.id, id);
      refreshData();
    }
  };

  // Image upload and compression
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length + selectedPhotos.length > 3) {
      alert("Você pode adicionar no máximo 3 fotos por atendimento.");
      return;
    }

    setIsCompressing(true);
    const options = {
      maxSizeMB: 0.12,
      maxWidthOrHeight: 700,
      useWebWorker: true,
    };

    try {
      const compressedList = [];
      for (const file of files) {
        const compressedFile = await imageCompression(file, options);
        const base64 = await convertToBase64(compressedFile);
        compressedList.push(base64);
      }
      setSelectedPhotos(prev => [...prev, ...compressedList]);
    } catch (error) {
      console.error("Erro ao comprimir fotos:", error);
      alert("Erro ao processar as imagens.");
    } finally {
      setIsCompressing(false);
    }
  };

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  const removePhoto = (index) => {
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // Quick select pill click handler
  const handlePillClick = (field, value) => {
    setAttendanceForm(prev => {
      const current = prev[field].trim();
      if (!current) return { ...prev, [field]: value };
      if (current.includes(value)) return prev;
      return { ...prev, [field]: `${current}, ${value}` };
    });
  };

  const handleAppointmentPillClick = (value) => {
    setAppointmentForm(prev => {
      const current = prev.servicos.trim();
      if (!current) return { ...prev, servicos: value };
      if (current.includes(value)) return prev;
      return { ...prev, servicos: `${current}, ${value}` };
    });
  };

  // Dynamic WhatsApp url generator
  const handleWhatsAppReminder = (client, item) => {
    const name = client.nome;
    const phone = client.telefone;
    const days = item.diasPassados === 999 ? 30 : item.diasPassados;

    let lateralStyle = "corte";
    if (item.ultimoCorte && item.ultimoCorte.laterais) {
      lateralStyle = item.ultimoCorte.laterais.split(',')[0].toLowerCase();
    }

    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length <= 11) {
      cleanPhone = '55' + cleanPhone;
    }

    const msg = `Fala, ${name}! Já faz ${days} dias desde o seu último ${lateralStyle}. Bora renovar o visual esta semana? ✂️💈`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // Format date helper
  const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatRelativeTime = (isoString) => {
    if (!isoString) return '';
    const diff = new Date() - new Date(isoString);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'hoje';
    if (days === 1) return 'ontem';
    return `há ${days} dias`;
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  // Days list around the selected Date for Horizontal Date Picker
  const getDaysArray = (centerDateStr) => {
    const days = [];
    const center = new Date(centerDateStr + 'T12:00:00');
    for (let i = -3; i <= 3; i++) {
      const d = new Date(center);
      d.setDate(center.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const activeClient = (selectedClientId && currentUser && currentUser.role !== 'admin') ? db.getCliente(currentUser.id, selectedClientId) : null;
  const allDbClients = (currentUser && currentUser.role !== 'admin') ? db.getClientes(currentUser.id, '') : [];
  const filteredClientsForAppointment = appFormSearch.trim()
    ? allDbClients.filter(c => c.nome.toLowerCase().includes(appFormSearch.toLowerCase()) || c.telefone.includes(appFormSearch))
    : allDbClients.slice(0, 5);

  const quickPills = {
    laterais: ['Degradê na 0', 'Degradê na 1', 'Disfarçado', 'Na Tesoura', 'Degradê Navalhado', 'Americano', 'Social na 2'],
    topo: ['3 Dedos', '4 Dedos', 'Texturizado na Tesoura', 'Crew Cut', 'Pompadour', 'Buzzcut', 'Franja Curta'],
    barba: ['Sem Barba', 'Alinhada Navalha', 'Tamanho Médio', 'Espessa / Cheia', 'Cerrada', 'Cavanhaque'],
    produtos: ['Pomada Matte', 'Pomada Brilho', 'Óleo de Barba', 'Balm Modelador', 'Gel', 'Sem Produto'],
    agenda: ['Corte', 'Barba', 'Corte + Barba', 'Sobrancelha', 'Luzes/Platinado', 'Selagem/Progressiva']
  };

  // ========================================================
  // RENDER: AUTH SCREEN (If no user is logged in)
  // ========================================================
  if (!currentUser) {
    return (
      <div className="min-h-screen w-full bg-barber-dark flex items-center justify-center font-sans px-4 py-8 relative overflow-hidden">

        {/* Decorative background lights */}
        <div className="absolute top-[-10%] left-[-10%] w-[350px] h-[350px] rounded-full bg-barber-accent/10 blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[350px] h-[350px] rounded-full bg-barber-accent/5 blur-[100px] pointer-events-none"></div>

        <div className="w-full max-w-sm bg-barber-card border border-barber-border/80 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-6 fade-in z-10">

          {/* Logo / Branding */}
          <div className="flex flex-col items-center text-center space-y-2">
            <img src="/logo.svg" alt="BarberMemo Logo" className="w-14 h-14 object-contain rounded-xl shadow-lg" />
            <h1 className="text-xl font-bold tracking-tight text-zinc-100">BarberMemo</h1>
            <p className="text-[11px] text-zinc-400">Ficha técnica e agenda individual para Barbeiros</p>
          </div>

          {/* Errors Banner */}
          {authError && (
            <div className="bg-red-500/10 border border-red-500/25 p-3 rounded-lg flex items-start gap-2 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {/* VIEW: LOGIN FORM */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase block">E-mail</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
                <input
                  type="email" required placeholder="Ex: nome@gmail.com"
                  className="w-full bg-barber-dark border border-barber-border rounded-xl py-3 pl-10 pr-4 text-xs text-barber-text-primary placeholder:text-zinc-650"
                  value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase block">Senha</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
                <input
                  type="password" required placeholder="Sua senha"
                  className="w-full bg-barber-dark border border-barber-border rounded-xl py-3 pl-10 pr-4 text-xs text-barber-text-primary placeholder:text-zinc-650"
                  value={authForm.senha} onChange={(e) => setAuthForm({ ...authForm, senha: e.target.value })}
                />
              </div>
            </div>

            <button type="submit" className="w-full bg-barber-accent hover:bg-barber-accent-hover text-white py-3.5 rounded-xl font-bold text-xs shadow-lg uppercase tracking-wider transition-all">
              Acessar Minha Carteira
            </button>
          </form>

        </div>
      </div>
    );
  }

  // ========================================================
  // RENDER: SaaS ADMINISTRATOR WORKSPACE
  // ========================================================
  if (currentUser.role === 'admin') {
    return (
      <div className="min-h-screen w-full bg-barber-dark text-barber-text-primary flex flex-col font-sans">

        {/* Admin Header */}
        <header className="px-6 py-4 bg-barber-card border-b border-barber-border flex justify-between items-center shadow-md">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Logo" className="w-8 h-8 object-contain rounded-lg" />
            <div>
              <h1 className="text-base font-extrabold tracking-tight flex items-center gap-1.5">
                BarberMemo <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[8px] tracking-widest font-black uppercase px-2 py-0.5 rounded">SaaS ADMIN</span>
              </h1>
              <p className="text-[10px] text-zinc-400">Painel Central de Gerenciamento de Barbeiros</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-zinc-400 hidden sm:inline">Bem-vindo, <strong>{currentUser.nome}</strong></span>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-xs font-bold flex items-center gap-1.5 border border-zinc-750 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sair
            </button>
          </div>
        </header>

        <div className="flex-1 flex flex-col md:flex-row">

          {/* Admin Sidebar Navigation */}
          <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-barber-border bg-barber-card/30 p-4 space-y-4">
            <div className="flex md:flex-col gap-2">
              <button
                onClick={() => { setAdminTab('barbeiros'); setShowAdminForm(false); }}
                className={`flex-1 md:flex-none py-2.5 px-4 rounded-xl text-left text-xs font-bold flex items-center gap-2 transition-all ${adminTab === 'barbeiros' ? 'bg-barber-accent text-white shadow-lg shadow-barber-accent/10' : 'text-zinc-400 hover:bg-zinc-850/50 hover:text-zinc-200'
                  }`}
              >
                <Users className="w-4 h-4" />
                Gerenciar Barbeiros
              </button>
              <button
                onClick={() => { setAdminTab('metrics'); setShowAdminForm(false); }}
                className={`flex-1 md:flex-none py-2.5 px-4 rounded-xl text-left text-xs font-bold flex items-center gap-2 transition-all ${adminTab === 'metrics' ? 'bg-barber-accent text-white shadow-lg shadow-barber-accent/10' : 'text-zinc-400 hover:bg-zinc-850/50 hover:text-zinc-200'
                  }`}
              >
                <BarChart3 className="w-4 h-4" />
                Métricas Globais
              </button>
            </div>

            <div className="hidden md:block pt-4 border-t border-barber-border/30 text-[10px] text-zinc-500 space-y-1.5 px-2">
              <p>BarberMemo SaaS v1.2</p>
              <p>Segurança: Isolamento Relacional por Barbeiro ativo.</p>
            </div>
          </aside>

          {/* Admin Main Pane */}
          <main className="flex-1 p-6 overflow-y-auto max-w-4xl">

            {/* VIEW: BARBER LIST & REGISTER */}
            {adminTab === 'barbeiros' && (
              <div className="space-y-6 fade-in">

                <div className="flex justify-between items-center gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-zinc-100">Barbeiros Cadastrados</h2>
                    <p className="text-xs text-zinc-500">Crie, edite e remova credenciais de barbeiros.</p>
                  </div>
                  {!showAdminForm && (
                    <button
                      onClick={() => {
                        setAdminBarberForm({ nome: '', email: '', senha: '', barbeariaName: '' });
                        setEditingBarberId(null);
                        setAdminError('');
                        setShowAdminForm(true);
                      }}
                      className="bg-barber-accent hover:bg-barber-accent-hover text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 shadow-md shadow-barber-accent/10 transition-all active:scale-95"
                    >
                      <Plus className="w-4 h-4" /> Cadastrar Barbeiro
                    </button>
                  )}
                </div>

                {/* FORM: ADD / EDIT BARBER */}
                {showAdminForm && (
                  <div className="bg-barber-card border border-barber-border rounded-2xl p-5 space-y-4 shadow-xl">
                    <div className="flex justify-between items-center border-b border-barber-border/40 pb-3">
                      <span className="font-bold text-sm text-zinc-200">
                        {editingBarberId ? 'Editar Dados do Barbeiro' : 'Cadastrar Novo Barbeiro no SaaS'}
                      </span>
                      <button
                        onClick={() => { setShowAdminForm(false); setEditingBarberId(null); }}
                        className="text-zinc-500 hover:text-zinc-300 text-xs"
                      >
                        Cancelar
                      </button>
                    </div>

                    {adminError && (
                      <div className="bg-red-500/10 border border-red-500/25 p-3 rounded-lg flex items-center gap-2 text-red-400 text-xs">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{adminError}</span>
                      </div>
                    )}

                    <form onSubmit={handleAdminSaveBarber} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-zinc-400 uppercase block">Nome Completo</label>
                        <div className="relative">
                          <User className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                          <input
                            type="text" required placeholder="Ex: Lucas Mendes"
                            className="w-full bg-barber-dark border border-barber-border rounded-xl py-2.5 pl-9 pr-3 text-xs text-barber-text-primary"
                            value={adminBarberForm.nome} onChange={(e) => setAdminBarberForm({ ...adminBarberForm, nome: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-zinc-400 uppercase block">Nome da Barbearia</label>
                        <div className="relative">
                          <Store className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                          <input
                            type="text" required placeholder="Ex: Barbearia da Esquina"
                            className="w-full bg-barber-dark border border-barber-border rounded-xl py-2.5 pl-9 pr-3 text-xs text-barber-text-primary"
                            value={adminBarberForm.barbeariaName} onChange={(e) => setAdminBarberForm({ ...adminBarberForm, barbeariaName: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-zinc-400 uppercase block">E-mail de Login</label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                          <input
                            type="email" required placeholder="Ex: lucas@barber.com"
                            className="w-full bg-barber-dark border border-barber-border rounded-xl py-2.5 pl-9 pr-3 text-xs text-barber-text-primary"
                            value={adminBarberForm.email} onChange={(e) => setAdminBarberForm({ ...adminBarberForm, email: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-zinc-400 uppercase block">Senha de Acesso</label>
                        <div className="relative">
                          <LockKeyhole className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                          <input
                            type="text" required placeholder="Senha provisória"
                            className="w-full bg-barber-dark border border-barber-border rounded-xl py-2.5 pl-9 pr-3 text-xs text-barber-text-primary"
                            value={adminBarberForm.senha} onChange={(e) => setAdminBarberForm({ ...adminBarberForm, senha: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="md:col-span-2 pt-2 flex gap-3">
                        <button
                          type="button"
                          onClick={() => { setShowAdminForm(false); setEditingBarberId(null); }}
                          className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-3 rounded-xl text-xs font-bold transition-all"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="flex-1 bg-barber-accent hover:bg-barber-accent-hover text-white py-3 rounded-xl text-xs font-bold transition-all shadow-md shadow-barber-accent/15"
                        >
                          {editingBarberId ? 'Salvar Alterações' : 'Confirmar e Cadastrar'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* TABLE LIST OF BARBERS */}
                <div className="bg-barber-card border border-barber-border rounded-2xl overflow-hidden shadow-lg">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-zinc-950/80 border-b border-barber-border/80 text-[10px] text-zinc-450 uppercase font-bold tracking-wider">
                          <th className="py-3.5 px-4">Barbeiro</th>
                          <th className="py-3.5 px-4">Barbearia</th>
                          <th className="py-3.5 px-4">E-mail de Acesso</th>
                          <th className="py-3.5 px-4">Senha</th>
                          <th className="py-3.5 px-4 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-barber-border/40">
                        {barbeirosList.map((b) => (
                          <tr key={b.id} className="hover:bg-zinc-850/20 transition-colors">
                            <td className="py-4 px-4 font-semibold text-zinc-200">{b.nome}</td>
                            <td className="py-4 px-4 text-zinc-400">{b.barbeariaName}</td>
                            <td className="py-4 px-4 text-zinc-450 select-all font-mono">{b.email}</td>
                            <td className="py-4 px-4 text-zinc-500 font-mono">{b.senha}</td>
                            <td className="py-4 px-4">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleAdminEditClick(b)}
                                  className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-barber-accent-light transition-colors"
                                  title="Editar Barbeiro"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleAdminDeleteClick(b.id)}
                                  className="p-2 hover:bg-red-950/30 rounded-lg text-red-500 hover:text-red-400 transition-colors"
                                  title="Excluir Barbeiro"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {barbeirosList.length === 0 && (
                          <tr>
                            <td colSpan="5" className="py-8 text-center text-zinc-550">
                              Nenhum barbeiro cadastrado no sistema.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* VIEW: GLOBAL METRICS */}
            {adminTab === 'metrics' && (
              <div className="space-y-6 fade-in">
                <div>
                  <h2 className="text-lg font-bold text-zinc-100">Visão Geral da Plataforma</h2>
                  <p className="text-xs text-zinc-500">Métricas consolidadas de todos os tenants cadastrados.</p>
                </div>

                {/* Global Metrics Cards Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-barber-card border border-barber-border rounded-2xl p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-barber-accent/10 border border-barber-accent/20 flex items-center justify-center text-barber-accent">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider">Barbeiros Ativos</span>
                      <span className="text-2xl font-black text-zinc-100">{adminGlobalStats.totalBarbeiros}</span>
                    </div>
                  </div>

                  <div className="bg-barber-card border border-barber-border rounded-2xl p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider">Clientes Totais</span>
                      <span className="text-2xl font-black text-zinc-100">{adminGlobalStats.totalClientes}</span>
                    </div>
                  </div>

                  <div className="bg-barber-card border border-barber-border rounded-2xl p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-455">
                      <Scissors className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider">Cortes Registrados</span>
                      <span className="text-2xl font-black text-zinc-100">{adminGlobalStats.totalAtendimentos}</span>
                    </div>
                  </div>

                  <div className="bg-barber-card border border-barber-border rounded-2xl p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider">Agendamentos Marcados</span>
                      <span className="text-2xl font-black text-zinc-100">{adminGlobalStats.totalAgendamentos}</span>
                    </div>
                  </div>
                </div>

                {/* System Diagnostics Info */}
                <div className="bg-barber-card border border-barber-border rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <ShieldAlert className="w-4 h-4 text-barber-accent" />
                    <span className="text-xs font-bold uppercase tracking-wider">Diagnóstico de Armazenamento</span>
                  </div>
                  <div className="h-[1px] bg-barber-border/50"></div>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Os dados do BarberMemo estão salvos localmente na partição <code className="bg-zinc-950 text-zinc-400 px-1 py-0.5 rounded font-mono select-all">localStorage</code> do seu navegador. O limite típico por domínio é de 5MB. Fotos de corte são comprimidas pelo frontend para cerca de 120KB cada, permitindo salvar centenas de fichas de forma segura sem estourar a cota de memória local.
                  </p>
                </div>

              </div>
            )}

          </main>

        </div>

      </div>
    );
  }

  // ========================================================
  // RENDER: MAIN APP INTERFACE (Mobile + Desktop views)
  // ========================================================
  return (
    <div className="min-h-screen bg-barber-dark text-barber-text-primary flex items-center justify-center font-sans">

      {/* ======================================================== */}
      {/* 1. MOBILE LAYOUT (Visible only on screens < md / tablet) */}
      {/* ======================================================== */}
      <div className="block md:hidden w-full max-w-md min-h-screen bg-barber-dark border-x border-barber-border flex flex-col relative shadow-2xl">

        {/* Header */}
        <header className="px-5 py-4 border-b border-barber-border bg-barber-card/60 backdrop-blur-md sticky top-0 z-10 flex justify-between items-center">
          <div className="flex items-center gap-2" onClick={() => setCurrentView('dashboard')}>
            <img src="/logo.svg" alt="Logo" className="w-8 h-8 object-contain rounded-lg shadow-md cursor-pointer" />
            <div>
              <h1 className="text-sm font-bold tracking-tight cursor-pointer">BarberMemo</h1>
              <p className="text-[10px] text-barber-text-secondary flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Barbeiro: {currentUser.nome} {currentUser.barbeariaName ? `(${currentUser.barbeariaName})` : ''}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 bg-barber-light/30 border border-barber-border rounded-lg text-zinc-400 hover:text-white"
            title="Sair"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 pb-24">

          {/* VIEW: DASHBOARD (MOBILE) */}
          {currentView === 'dashboard' && (
            <div className="px-4 py-5 space-y-6 fade-in">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-barber-card border border-barber-border rounded-xl p-3 text-center">
                  <Users className="w-4 h-4 mx-auto mb-1 text-barber-accent-light" />
                  <span className="text-[10px] text-barber-text-secondary block">Meus Clientes</span>
                  <span className="text-base font-bold">{stats.totalClientes}</span>
                </div>
                <div className="bg-barber-card border border-barber-border rounded-xl p-3 text-center">
                  <Scissors className="w-4 h-4 mx-auto mb-1 text-barber-accent-light" />
                  <span className="text-[10px] text-barber-text-secondary block">Cortes Feitos</span>
                  <span className="text-base font-bold">{stats.totalAtendimentos}</span>
                </div>
                <div className="bg-barber-card border border-barber-border rounded-xl p-3 text-center">
                  <TrendingUp className="w-4 h-4 mx-auto mb-1 text-barber-accent-light" />
                  <span className="text-[10px] text-barber-text-secondary block">Este Mês</span>
                  <span className="text-base font-bold">{stats.atendimentosMes}</span>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-3.5 text-barber-text-secondary w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar cliente por nome ou celular..."
                  className="w-full bg-barber-card border border-barber-border rounded-xl py-3 pl-9 pr-4 text-xs text-barber-text-primary placeholder:text-zinc-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-3.5 text-barber-text-secondary hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Alertas de Retorno */}
              {!searchQuery && proximosRetornos.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 text-barber-accent-light px-1">
                    <Clock className="w-4 h-4" />
                    <h2 className="text-xs font-semibold uppercase tracking-wider">Alertas de Retorno</h2>
                    <span className="ml-auto bg-amber-500/10 text-amber-500 text-[10px] px-2 py-0.5 rounded-full border border-amber-500/20 font-bold">
                      {proximosRetornos.length} pendentes
                    </span>
                  </div>

                  <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                    {proximosRetornos.map((item) => (
                      <div
                        key={item.cliente.id}
                        className="flex-shrink-0 w-64 bg-amber-500/[0.02] border border-amber-500/20 rounded-xl p-4 flex flex-col justify-between"
                      >
                        <div className="cursor-pointer" onClick={() => {
                          setSelectedClientId(item.cliente.id);
                          setCurrentView('client-profile');
                        }}>
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-semibold text-sm text-zinc-100 block truncate pr-2">{item.cliente.nome}</span>
                            <span className="text-[9px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded">
                              {item.diasAtrasados > 0 ? `Atrasado ${item.diasAtrasados}d` : 'Hoje'}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 mb-3 truncate">
                            Último: {item.ultimoCorte ? `${item.ultimoCorte.laterais} (${formatRelativeTime(item.ultimoCorte.data)})` : 'Nenhum corte registrado'}
                          </p>
                        </div>
                        <button
                          onClick={() => handleWhatsAppReminder(item.cliente, item)}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-950/20"
                        >
                          <Phone className="w-3.5 h-3.5 fill-white text-emerald-600" />
                          Lembrar Cliente
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Clientes List */}
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <h2 className="text-xs font-semibold text-barber-text-secondary uppercase tracking-wider">
                    {searchQuery ? 'Resultados da Busca' : 'Todos os Meus Clientes'}
                  </h2>
                  <span className="text-[10px] text-zinc-500 font-medium">{clientes.length} total</span>
                </div>

                <div className="bg-barber-card border border-barber-border rounded-xl divide-y divide-barber-border overflow-hidden">
                  {clientes.length > 0 ? (
                    clientes.map((c) => {
                      const clientDetails = db.getCliente(currentUser.id, c.id);
                      const lastCut = clientDetails.atendimentos[0];
                      return (
                        <div
                          key={c.id}
                          className="p-4 hover:bg-barber-light/30 transition-colors flex justify-between items-center cursor-pointer"
                          onClick={() => {
                            setSelectedClientId(c.id);
                            setCurrentView('client-profile');
                          }}
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-semibold text-sm block text-zinc-200 truncate">{c.nome}</span>
                            <span className="text-[11px] text-barber-text-secondary block mt-0.5">
                              {c.telefone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')}
                            </span>
                            {lastCut && (
                              <span className="text-[10px] text-barber-accent block mt-1.5 flex items-center gap-1">
                                <Scissors className="w-3 h-3" />
                                {lastCut.laterais} • {formatRelativeTime(lastCut.data)}
                              </span>
                            )}
                          </div>
                          <div className="ml-4 flex-shrink-0">
                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                              <ChevronLeft className="w-4 h-4 rotate-180 text-zinc-400" />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-8 text-center text-zinc-500">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 text-zinc-650" />
                      <p className="text-xs">Nenhum cliente cadastrado em sua conta</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: AGENDA (MOBILE) */}
          {currentView === 'agenda' && (
            <div className="px-4 py-5 space-y-6 fade-in">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-barber-accent" />
                  Minha Agenda do Dia
                </h2>
                <button
                  onClick={() => {
                    setAppointmentForm({ clienteId: '', data: selectedDate, hora: '10:00', servicos: 'Corte' });
                    setAppFormSearch('');
                    setCurrentView('new-appointment');
                  }}
                  className="bg-barber-accent hover:bg-barber-accent-hover text-white text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 shadow-md shadow-barber-accent/10"
                >
                  <Plus className="w-3.5 h-3.5" /> Agendar
                </button>
              </div>

              {/* Datepicker */}
              <div className="space-y-3">
                <input
                  type="date"
                  className="w-full bg-barber-card border border-barber-border rounded-xl py-2 px-3 text-xs text-barber-text-primary"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />

                {/* Horizontal Scroll Selector */}
                <div className="flex gap-2 justify-between">
                  {getDaysArray(selectedDate).map((day, idx) => {
                    const dateStr = day.toISOString().split('T')[0];
                    const isActive = dateStr === selectedDate;
                    const dayNum = day.getDate();
                    const dayName = day.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');

                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedDate(dateStr)}
                        className={`flex-1 flex flex-col items-center py-2 px-1 rounded-lg border text-center transition-all ${isActive
                          ? 'bg-barber-accent border-barber-accent text-white shadow-md'
                          : 'bg-barber-card border-barber-border text-zinc-400 hover:bg-zinc-800'
                          }`}
                      >
                        <span className="text-[9px] uppercase font-bold tracking-tight block">{dayName}</span>
                        <span className="text-sm font-extrabold mt-0.5 block">{dayNum}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Scheduled List */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block px-1">Compromissos</span>
                <div className="space-y-3">
                  {agendamentos.length > 0 ? (
                    agendamentos.map((ag) => {
                      const clientName = ag.cliente ? ag.cliente.nome : 'Cliente Desconhecido';
                      return (
                        <div
                          key={ag.id}
                          className={`bg-barber-card border rounded-xl p-4 flex items-center justify-between gap-3 transition-all ${ag.status === 'Concluído' ? 'border-emerald-900/30 bg-emerald-950/[0.02]' : 'border-barber-border'
                            }`}
                        >
                          <div
                            className="min-w-0 flex-1 cursor-pointer"
                            onClick={() => {
                              if (ag.clienteId) {
                                setSelectedClientId(ag.clienteId);
                                setCurrentView('client-profile');
                              }
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-barber-accent flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {formatTime(ag.dataHora)}
                              </span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${ag.status === 'Concluído'
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                : ag.status === 'Confirmado'
                                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                                  : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                }`}>
                                {ag.status}
                              </span>
                            </div>
                            <span className="font-semibold text-sm text-zinc-200 block truncate mt-1">{clientName}</span>
                            <span className="text-[10px] text-zinc-400 block mt-0.5">{ag.servicos}</span>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {ag.status !== 'Concluído' && (
                              <button
                                onClick={() => handleToggleAppointmentStatus(ag.id, 'Concluído')}
                                className="p-2 bg-emerald-900/10 border border-emerald-800/20 rounded-lg text-emerald-500"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {ag.status === 'Pendente' && (
                              <button
                                onClick={() => handleToggleAppointmentStatus(ag.id, 'Confirmado')}
                                className="p-2 bg-sky-900/10 border border-sky-850/20 rounded-lg text-sky-400"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteAppointment(ag.id)}
                              className="p-2 bg-red-950/20 border border-red-900/30 rounded-lg text-red-400"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="bg-barber-card border border-barber-border rounded-xl p-8 text-center text-zinc-500">
                      <Calendar className="w-8 h-8 mx-auto mb-2 text-zinc-700" />
                      <p className="text-xs">Nenhum compromisso marcado para este dia.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: NEW APPOINTMENT (MOBILE) */}
          {currentView === 'new-appointment' && (
            <div className="px-4 py-5 space-y-6 fade-in">
              <div className="flex items-center gap-3">
                <button onClick={() => setCurrentView('agenda')} className="p-2 bg-barber-card border border-barber-border rounded-lg text-zinc-400">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h2 className="text-base font-bold">Novo Agendamento</h2>
              </div>

              <form onSubmit={handleSaveAppointment} className="space-y-4">
                {/* Search / Select Client */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400">1. Selecionar Cliente</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-zinc-500 w-3.5 h-3.5" />
                    <input
                      type="text" placeholder="Pesquisar entre meus clientes..."
                      className="w-full bg-barber-card border border-barber-border rounded-xl py-2 pl-9 pr-4 text-xs text-barber-text-primary"
                      value={appFormSearch} onChange={(e) => setAppFormSearch(e.target.value)}
                    />
                  </div>

                  {/* Matching List */}
                  <div className="bg-barber-card border border-barber-border rounded-xl divide-y divide-barber-border/30 overflow-hidden max-h-36 overflow-y-auto">
                    {filteredClientsForAppointment.map(c => {
                      const selected = appointmentForm.clienteId === c.id;
                      return (
                        <div
                          key={c.id}
                          onClick={() => {
                            setAppointmentForm({ ...appointmentForm, clienteId: c.id });
                            setAppFormSearch(c.nome);
                          }}
                          className={`p-2.5 text-xs cursor-pointer flex justify-between items-center transition-colors ${selected ? 'bg-barber-accent/15 text-white' : 'hover:bg-zinc-800'
                            }`}
                        >
                          <span>{c.nome}</span>
                          {selected && <Check className="w-3.5 h-3.5 text-barber-accent-light" />}
                        </div>
                      );
                    })}
                    {filteredClientsForAppointment.length === 0 && appFormSearch.trim() !== '' && (
                      <div className="p-3 text-center bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
                        <p className="text-xs text-amber-500">Cliente não encontrado, deseja adicionar à lista de clientes?</p>
                        <button
                          type="button"
                          onClick={() => {
                            setClientForm({ nome: appFormSearch, telefone: '', intervaloDiasRetorno: 20 });
                            setCameFromAppointment(true);
                            setCurrentView('new-client');
                          }}
                          className="text-[10px] font-bold text-white bg-barber-accent hover:bg-barber-accent-hover py-1 px-3 rounded-lg"
                        >
                          Adicionar "{appFormSearch}"
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Date / Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-400">2. Data</label>
                    <input
                      type="date" required
                      className="w-full bg-barber-card border border-barber-border rounded-xl py-2.5 px-3.5 text-xs text-barber-text-primary"
                      value={appointmentForm.data} onChange={(e) => setAppointmentForm({ ...appointmentForm, data: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-400">3. Horário</label>
                    <input
                      type="time" required
                      className="w-full bg-barber-card border border-barber-border rounded-xl py-2.5 px-3.5 text-xs text-barber-text-primary"
                      value={appointmentForm.hora} onChange={(e) => setAppointmentForm({ ...appointmentForm, hora: e.target.value })}
                    />
                  </div>
                </div>

                {/* Services */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 block">4. Serviços Desejados</label>
                  <input
                    type="text" required placeholder="Ex: Corte e Barba..."
                    className="w-full bg-barber-card border border-barber-border rounded-xl py-2 px-3.5 text-xs text-barber-text-primary"
                    value={appointmentForm.servicos} onChange={(e) => setAppointmentForm({ ...appointmentForm, servicos: e.target.value })}
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {quickPills.agenda.map((pill) => (
                      <button
                        key={pill} type="button" onClick={() => handleAppointmentPillClick(pill)}
                        className="bg-zinc-800 text-[9px] text-zinc-300 px-2 py-0.5 rounded border border-zinc-700"
                      >
                        {pill}
                      </button>
                    ))}
                  </div>
                </div>

                <button type="submit" className="w-full bg-barber-accent hover:bg-barber-accent-hover text-white py-3.5 rounded-xl font-bold text-sm shadow-lg mt-4">
                  Confirmar Agendamento
                </button>
              </form>
            </div>
          )}

          {/* VIEW: NEW CLIENT (MOBILE) */}
          {currentView === 'new-client' && (
            <div className="px-4 py-5 space-y-6 fade-in">
              <div className="flex items-center gap-3">
                <button onClick={() => setCurrentView('dashboard')} className="p-2 bg-barber-card border border-barber-border rounded-lg text-zinc-400">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h2 className="text-base font-bold">Cadastrar Cliente</h2>
              </div>
              <form onSubmit={handleSaveClient} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-barber-text-secondary block">Nome Completo</label>
                  <input
                    type="text" required placeholder="Ex: João da Silva"
                    className="w-full bg-barber-card border border-barber-border rounded-xl py-3 px-4 text-sm text-barber-text-primary"
                    value={clientForm.nome} onChange={(e) => setClientForm({ ...clientForm, nome: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-barber-text-secondary block">WhatsApp (com DDD)</label>
                  <input
                    type="tel" required placeholder="Ex: 11988887777"
                    className="w-full bg-barber-card border border-barber-border rounded-xl py-3 px-4 text-sm text-barber-text-primary"
                    value={clientForm.telefone} onChange={(e) => setClientForm({ ...clientForm, telefone: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-barber-text-secondary block">Intervalo de Retorno (Dias)</label>
                  <div className="flex gap-2">
                    {[15, 20, 25, 30].map((days) => (
                      <button
                        key={days} type="button" onClick={() => setClientForm({ ...clientForm, intervaloDiasRetorno: days })}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${clientForm.intervaloDiasRetorno === days
                          ? 'bg-barber-accent text-white border-barber-accent'
                          : 'bg-barber-card text-zinc-400 border-barber-border'
                          }`}
                      >
                        {days}d
                      </button>
                    ))}
                  </div>
                  <input
                    type="number" min="1" placeholder="Personalizado"
                    className="w-full bg-barber-card border border-barber-border rounded-xl py-3 px-4 text-sm mt-2"
                    value={clientForm.intervaloDiasRetorno} onChange={(e) => setClientForm({ ...clientForm, intervaloDiasRetorno: parseInt(e.target.value, 10) || '' })}
                  />
                </div>
                <button type="submit" className="w-full bg-barber-accent hover:bg-barber-accent-hover text-white py-3.5 rounded-xl font-bold text-sm shadow-lg mt-4">
                  Salvar Cliente
                </button>
              </form>
            </div>
          )}

          {/* VIEW: CLIENT PROFILE (MOBILE) */}
          {currentView === 'client-profile' && activeClient && (
            <div className="px-4 py-5 space-y-6 fade-in">
              <div className="flex items-center gap-3">
                <button onClick={() => setCurrentView('dashboard')} className="p-2 bg-barber-card border border-barber-border rounded-lg text-zinc-400">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h2 className="text-base font-bold text-zinc-100 truncate flex-1">{activeClient.nome}</h2>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => {
                      setClientForm({ nome: activeClient.nome, telefone: activeClient.telefone, intervaloDiasRetorno: activeClient.intervaloDiasRetorno });
                      setCurrentView('edit-client');
                    }}
                    className="p-2 bg-barber-card border border-barber-border rounded-lg text-zinc-400"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteClient(activeClient.id)} className="p-2 bg-red-950/20 border border-red-900/30 rounded-lg text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Client Specs Card */}
              <div className="bg-barber-card border border-barber-border rounded-xl p-4 space-y-3">
                <p className="text-xs text-barber-text-secondary flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  {activeClient.telefone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')}
                </p>
                <div className="h-[1px] bg-barber-border"></div>
                <div className="flex justify-between items-center text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase block">Retorno</span>
                    <span className="font-semibold text-zinc-300">{activeClient.intervaloDiasRetorno} dias</span>
                  </div>
                  {activeClient.atendimentos.length > 0 ? (
                    (() => {
                      const last = activeClient.atendimentos[0];
                      const diff = new Date() - new Date(last.data);
                      const elapsed = Math.floor(diff / (1000 * 60 * 60 * 24));
                      const isOverdue = elapsed >= activeClient.intervaloDiasRetorno;
                      return (
                        <div className="text-right">
                          <span className="text-[10px] text-zinc-500 uppercase block">Status</span>
                          <span className={`font-semibold ${isOverdue ? 'text-amber-500' : 'text-emerald-500'}`}>
                            {elapsed === 0 ? 'Hoje' : `há ${elapsed} dias`}
                          </span>
                        </div>
                      );
                    })()
                  ) : (
                    <span className="text-[10px] font-bold text-amber-500">Sem corte registrado</span>
                  )}
                </div>

                {activeClient.atendimentos.length > 0 && (() => {
                  const last = activeClient.atendimentos[0];
                  const diff = new Date() - new Date(last.data);
                  const elapsed = Math.floor(diff / (1000 * 60 * 60 * 24));
                  const isOverdue = elapsed >= (activeClient.intervaloDiasRetorno - 2);
                  if (isOverdue) {
                    return (
                      <button
                        onClick={() => handleWhatsAppReminder(activeClient, { diasPassados: elapsed, ultimoCorte: last })}
                        className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
                      >
                        <Phone className="w-3.5 h-3.5 fill-white text-emerald-600" />
                        Enviar Lembrete WhatsApp
                      </button>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Timeline */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-semibold text-barber-text-secondary uppercase tracking-wider">Histórico</h3>
                  <button
                    onClick={() => {
                      setAttendanceForm({ laterais: '', topo: '', barba: '', produtos: '' });
                      setSelectedPhotos([]);
                      setCurrentView('new-attendance');
                    }}
                    className="text-xs font-bold text-barber-accent hover:text-barber-accent-light flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Novo Corte
                  </button>
                </div>

                {activeClient.atendimentos.length > 0 ? (
                  <div className="relative border-l border-barber-border ml-2 pl-4 space-y-5">
                    {activeClient.atendimentos.map((item) => (
                      <div key={item.id} className="relative">
                        <span className="absolute -left-[22px] top-1.5 w-3 h-3 rounded-full border border-barber-accent bg-barber-dark"></span>
                        <div className="bg-barber-card border border-barber-border rounded-xl p-3.5 space-y-2">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-zinc-200">{formatDate(item.data)}</span>
                            <span className="text-zinc-500">{formatRelativeTime(item.data)}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-barber-border/30">
                            {item.laterais && <div><span className="text-zinc-500 block uppercase text-[8px]">Laterais</span><span className="text-zinc-300 font-medium">{item.laterais}</span></div>}
                            {item.topo && <div><span className="text-zinc-500 block uppercase text-[8px]">Topo</span><span className="text-zinc-300 font-medium">{item.topo}</span></div>}
                            {item.barba && <div><span className="text-zinc-500 block uppercase text-[8px]">Barba</span><span className="text-zinc-300 font-medium">{item.barba}</span></div>}
                            {item.produtos && <div><span className="text-zinc-500 block uppercase text-[8px]">Produtos</span><span className="text-zinc-300 font-medium">{item.produtos}</span></div>}
                          </div>

                          {item.fotos && item.fotos.length > 0 && (
                            <div className="flex gap-1.5 pt-2">
                              {item.fotos.map((src, i) => (
                                <img
                                  key={i} src={src} alt="Visual"
                                  onClick={() => setLightboxImage(src)}
                                  className="w-12 h-12 object-cover rounded border border-barber-border cursor-pointer"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-barber-card border border-barber-border rounded-xl p-6 text-center text-zinc-500">
                    <p className="text-xs">Nenhum corte registrado.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW: EDIT CLIENT (MOBILE) */}
          {currentView === 'edit-client' && activeClient && (
            <div className="px-4 py-5 space-y-6 fade-in">
              <div className="flex items-center gap-3">
                <button onClick={() => setCurrentView('client-profile')} className="p-2 bg-barber-card border border-barber-border rounded-lg text-zinc-400">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h2 className="text-base font-bold">Editar Cliente</h2>
              </div>
              <form onSubmit={handleUpdateClient} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-barber-text-secondary block">Nome Completo</label>
                  <input
                    type="text" required className="w-full bg-barber-card border border-barber-border rounded-xl py-3 px-4 text-sm text-barber-text-primary"
                    value={clientForm.nome} onChange={(e) => setClientForm({ ...clientForm, nome: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-barber-text-secondary block">WhatsApp (com DDD)</label>
                  <input
                    type="tel" required className="w-full bg-barber-card border border-barber-border rounded-xl py-3 px-4 text-sm text-barber-text-primary"
                    value={clientForm.telefone} onChange={(e) => setClientForm({ ...clientForm, telefone: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-barber-text-secondary block">Intervalo de Retorno (Dias)</label>
                  <div className="flex gap-2">
                    {[15, 20, 25, 30].map((days) => (
                      <button
                        key={days} type="button" onClick={() => setClientForm({ ...clientForm, intervaloDiasRetorno: days })}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${clientForm.intervaloDiasRetorno === days
                          ? 'bg-barber-accent text-white border-barber-accent'
                          : 'bg-barber-card text-zinc-400 border-barber-border'
                          }`}
                      >
                        {days}d
                      </button>
                    ))}
                  </div>
                  <input
                    type="number" min="1" className="w-full bg-barber-card border border-barber-border rounded-xl py-3 px-4 text-sm mt-2"
                    value={clientForm.intervaloDiasRetorno} onChange={(e) => setClientForm({ ...clientForm, intervaloDiasRetorno: parseInt(e.target.value, 10) || '' })}
                  />
                </div>
                <button type="submit" className="w-full bg-barber-accent hover:bg-barber-accent-hover text-white py-3.5 rounded-xl font-bold text-sm shadow-lg">
                  Salvar Alterações
                </button>
              </form>
            </div>
          )}

          {/* VIEW: NEW ATTENDANCE / FICHA (MOBILE) */}
          {currentView === 'new-attendance' && activeClient && (
            <div className="px-4 py-5 space-y-6 fade-in">
              <div className="flex items-center gap-3">
                <button onClick={() => setCurrentView('client-profile')} className="p-2 bg-barber-card border border-barber-border rounded-lg text-zinc-400">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-base font-bold">Novo Corte</h2>
                  <p className="text-[10px] text-zinc-500">Cliente: {activeClient.nome}</p>
                </div>
              </div>

              <form onSubmit={handleSaveAttendance} className="space-y-4">
                {/* Laterais */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 block">Laterais</label>
                  <input
                    type="text" required placeholder="Ex: Degradê na 1..."
                    className="w-full bg-barber-card border border-barber-border rounded-xl py-2 px-3.5 text-xs text-barber-text-primary"
                    value={attendanceForm.laterais} onChange={(e) => setAttendanceForm({ ...attendanceForm, laterais: e.target.value })}
                  />
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {quickPills.laterais.map((pill) => (
                      <button key={pill} type="button" onClick={() => handlePillClick('laterais', pill)} className="bg-zinc-800 text-[9px] text-zinc-300 px-2 py-0.5 rounded border border-zinc-700">
                        {pill}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Topo */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 block">Topo</label>
                  <input
                    type="text" placeholder="Ex: Texturizado..."
                    className="w-full bg-barber-card border border-barber-border rounded-xl py-2 px-3.5 text-xs text-barber-text-primary"
                    value={attendanceForm.topo} onChange={(e) => setAttendanceForm({ ...attendanceForm, topo: e.target.value })}
                  />
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {quickPills.topo.map((pill) => (
                      <button key={pill} type="button" onClick={() => handlePillClick('topo', pill)} className="bg-zinc-800 text-[9px] text-zinc-300 px-2 py-0.5 rounded border border-zinc-700">
                        {pill}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Barba */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 block">Barba</label>
                  <input
                    type="text" placeholder="Ex: Alinhada na navalha..."
                    className="w-full bg-barber-card border border-barber-border rounded-xl py-2 px-3.5 text-xs text-barber-text-primary"
                    value={attendanceForm.barba} onChange={(e) => setAttendanceForm({ ...attendanceForm, barba: e.target.value })}
                  />
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {quickPills.barba.map((pill) => (
                      <button key={pill} type="button" onClick={() => handlePillClick('barba', pill)} className="bg-zinc-800 text-[9px] text-zinc-300 px-2 py-0.5 rounded border border-zinc-700">
                        {pill}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Produtos */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 block">Produtos Aplicados</label>
                  <input
                    type="text" placeholder="Ex: Pomada matte..."
                    className="w-full bg-barber-card border border-barber-border rounded-xl py-2 px-3.5 text-xs text-barber-text-primary"
                    value={attendanceForm.produtos} onChange={(e) => setAttendanceForm({ ...attendanceForm, produtos: e.target.value })}
                  />
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {quickPills.produtos.map((pill) => (
                      <button key={pill} type="button" onClick={() => handlePillClick('produtos', pill)} className="bg-zinc-800 text-[9px] text-zinc-300 px-2 py-0.5 rounded border border-zinc-700">
                        {pill}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Photos */}
                <div className="space-y-2 pt-1">
                  <label className="text-xs font-semibold text-zinc-300 block">Fotos do Visual (Máx. 3)</label>
                  <div className="flex gap-2">
                    <label className="w-16 h-16 border border-dashed border-zinc-700 hover:border-barber-accent bg-barber-card rounded-lg cursor-pointer flex flex-col items-center justify-center flex-shrink-0">
                      <Camera className="w-4 h-4 text-zinc-500" />
                      <span className="text-[8px] text-zinc-500 font-bold mt-1">Câmera</span>
                      <input
                        type="file" accept="image/*" multiple className="hidden"
                        onChange={handleFileChange} disabled={isCompressing || selectedPhotos.length >= 3}
                      />
                    </label>

                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                      {selectedPhotos.map((src, i) => (
                        <div key={i} className="w-16 h-16 rounded border border-barber-border overflow-hidden relative flex-shrink-0">
                          <img src={src} alt="Upload" className="w-full h-full object-cover" />
                          <button
                            type="button" onClick={() => removePhoto(i)}
                            className="absolute top-0.5 right-0.5 bg-red-600 text-white rounded-full p-0.5 shadow"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                      {isCompressing && (
                        <div className="w-16 h-16 border border-barber-border rounded bg-barber-card flex flex-col items-center justify-center">
                          <div className="w-3.5 h-3.5 border border-barber-accent border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <button type="submit" disabled={isCompressing} className="w-full bg-barber-accent hover:bg-barber-accent-hover text-white py-3.5 rounded-xl font-bold text-sm shadow-lg mt-3 disabled:opacity-50">
                  Salvar Ficha do Corte
                </button>
              </form>
            </div>
          )}

        </main>

        {/* Global FAB (MOBILE) */}
        {currentView === 'dashboard' && (
          <div className="fixed bottom-20 right-6 z-20">
            <button
              onClick={() => {
                setClientForm({ nome: '', telefone: '', intervaloDiasRetorno: 20 });
                setCurrentView('new-client');
              }}
              className="w-14 h-14 bg-barber-accent hover:bg-barber-accent-hover text-white rounded-full flex items-center justify-center shadow-lg shadow-barber-accent/45 active:scale-95 transition-transform"
            >
              <UserPlus className="w-6 h-6" />
            </button>
          </div>
        )}

        {/* Bottom tab style navigation (MOBILE) */}
        <div className="fixed bottom-0 left-0 right-0 md:hidden bg-barber-card/85 backdrop-blur-md border-t border-barber-border py-3 px-6 flex justify-around items-center text-zinc-500 text-[10px] z-20">
          <button
            onClick={() => setCurrentView('dashboard')}
            className={`flex flex-col items-center gap-1 transition-colors ${currentView === 'dashboard' ? 'text-barber-accent font-bold' : 'hover:text-zinc-300'}`}
          >
            <Scissors className="w-4 h-4" />
            Painel
          </button>
          <button
            onClick={() => setCurrentView('agenda')}
            className={`flex flex-col items-center gap-1 transition-colors ${currentView === 'agenda' ? 'text-barber-accent font-bold' : 'hover:text-zinc-300'}`}
          >
            <Calendar className="w-4 h-4" />
            Agenda
          </button>
          <button
            onClick={() => {
              setClientForm({ nome: '', telefone: '', intervaloDiasRetorno: 20 });
              setCurrentView('new-client');
            }}
            className={`flex flex-col items-center gap-1 transition-colors ${currentView === 'new-client' ? 'text-barber-accent font-bold' : 'hover:text-zinc-300'}`}
          >
            <UserPlus className="w-4 h-4" />
            Novo Cliente
          </button>
        </div>

      </div>

      {/* ======================================================== */}
      {/* 2. DESKTOP LAYOUT (Visible only on screens >= md / tablet) */}
      {/* ======================================================== */}
      <div className="hidden md:flex w-full h-[90vh] max-w-5xl mx-4 bg-barber-card border border-barber-border rounded-2xl shadow-2xl overflow-hidden fade-in">

        {/* DESKTOP SIDEBAR (320px width) */}
        <aside className="w-80 border-r border-barber-border flex flex-col h-full bg-barber-card/50">

          {/* Brand header */}
          <div className="px-5 py-4 border-b border-barber-border flex justify-between items-center bg-barber-card">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setSelectedClientId(null); setCurrentView('dashboard'); }}>
              <img src="/logo.svg" alt="Logo" className="w-7 h-7 object-contain rounded-lg shadow-sm" />
              <div className="min-w-0 flex-1">
                <h1 className="text-sm font-bold tracking-tight truncate">{currentUser.barbeariaName || 'Minha Agenda'}</h1>
                <p className="text-[9px] text-zinc-500 truncate">Barbeiro: {currentUser.nome}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Sidebar Navigation Selector */}
          <div className="flex bg-zinc-950 p-1 rounded-lg mx-4 my-3 border border-barber-border/80">
            <button
              onClick={() => setSidebarTab('clientes')}
              className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${sidebarTab === 'clientes' ? 'bg-barber-accent text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
            >
              Clientes
            </button>
            <button
              onClick={() => setSidebarTab('agenda')}
              className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${sidebarTab === 'agenda' ? 'bg-barber-accent text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
            >
              Agenda
            </button>
          </div>

          {/* Render TAB content: CLIENTS */}
          {sidebarTab === 'clientes' && (
            <>
              {/* Stats */}
              <div className="p-4 grid grid-cols-3 gap-2 border-b border-barber-border/30 bg-barber-card/20">
                <div className="bg-zinc-800/30 rounded-lg p-2 text-center border border-barber-border/30">
                  <span className="text-[9px] text-zinc-500 block">Clientes</span>
                  <span className="text-xs font-bold text-zinc-200">{stats.totalClientes}</span>
                </div>
                <div className="bg-zinc-800/30 rounded-lg p-2 text-center border border-barber-border/30">
                  <span className="text-[9px] text-zinc-500 block">Cortes</span>
                  <span className="text-xs font-bold text-zinc-200">{stats.totalAtendimentos}</span>
                </div>
                <div className="bg-zinc-800/30 rounded-lg p-2 text-center border border-barber-border/30">
                  <span className="text-[9px] text-zinc-500 block">Este Mês</span>
                  <span className="text-xs font-bold text-zinc-200">{stats.atendimentosMes}</span>
                </div>
              </div>

              {/* Search Bar */}
              <div className="p-3 border-b border-barber-border/30">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 text-zinc-500 w-3.5 h-3.5" />
                  <input
                    type="text" placeholder="Buscar cliente..."
                    className="w-full bg-barber-dark border border-barber-border rounded-lg py-2 pl-8 pr-4 text-xs text-barber-text-primary"
                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-white">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Client list */}
              <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-4">

                {/* Sales alarm alerts */}
                {!searchQuery && proximosRetornos.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest px-1 block">Alertas de Retorno</span>
                    <div className="space-y-1.5">
                      {proximosRetornos.map((item) => (
                        <div
                          key={item.cliente.id}
                          className={`p-3 rounded-lg border text-xs cursor-pointer transition-all flex flex-col gap-2 ${selectedClientId === item.cliente.id
                            ? 'bg-amber-500/10 border-amber-500/40'
                            : 'bg-amber-500/[0.02] border-amber-500/20 hover:border-amber-500/30'
                            }`}
                          onClick={() => {
                            setSelectedClientId(item.cliente.id);
                            setCurrentView('client-profile');
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <span className="font-semibold text-zinc-200 truncate w-32">{item.cliente.nome}</span>
                            <span className="text-[8px] bg-amber-500/10 text-amber-500 px-1 py-0.2 rounded border border-amber-500/20 font-bold uppercase shrink-0">
                              {item.diasAtrasados > 0 ? `Atrasado ${item.diasAtrasados}d` : 'Hoje'}
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleWhatsAppReminder(item.cliente, item);
                            }}
                            className="w-full bg-emerald-600/90 hover:bg-emerald-600 text-white py-1 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-all"
                          >
                            <Phone className="w-3 h-3 fill-white text-emerald-650" />
                            Lembrar no WhatsApp
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* General list */}
                <div className="space-y-2">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest px-1 block">Clientes Cadastrados</span>
                  <div className="space-y-1">
                    {clientes.length > 0 ? (
                      clientes.map((c) => {
                        const active = selectedClientId === c.id;
                        return (
                          <div
                            key={c.id}
                            className={`p-2.5 rounded-lg text-xs cursor-pointer transition-all flex justify-between items-center ${active
                              ? 'bg-zinc-800/80 border border-barber-accent text-white'
                              : 'bg-transparent border border-transparent hover:bg-zinc-800/30 text-zinc-300'
                              }`}
                            onClick={() => {
                              setSelectedClientId(c.id);
                              setCurrentView('client-profile');
                            }}
                          >
                            <div className="truncate flex-1 pr-2">
                              <span className="font-medium block truncate">{c.nome}</span>
                              <span className="text-[10px] text-zinc-500 mt-0.5 block">{c.telefone}</span>
                            </div>
                            <ChevronLeft className={`w-3.5 h-3.5 text-zinc-500 rotate-180 transition-transform ${active ? 'text-barber-accent translate-x-1' : ''}`} />
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-6 text-zinc-650 text-[11px]">Nenhum cliente</div>
                    )}
                  </div>
                </div>

              </div>

              {/* Add Client sidebar footer */}
              <div className="p-4 border-t border-barber-border bg-barber-card">
                <button
                  onClick={() => {
                    setSelectedClientId(null);
                    setClientForm({ nome: '', telefone: '', intervaloDiasRetorno: 20 });
                    setCurrentView('new-client');
                  }}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 border border-zinc-750"
                >
                  <UserPlus className="w-4 h-4 text-barber-accent-light" />
                  Cadastrar Cliente
                </button>
              </div>
            </>
          )}

          {/* Render TAB content: AGENDA */}
          {sidebarTab === 'agenda' && (
            <>
              {/* Datepicker */}
              <div className="p-4 border-b border-barber-border/30 bg-barber-card/25 flex flex-col gap-2">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Selecione o Dia</span>
                <input
                  type="date"
                  className="w-full bg-barber-dark border border-barber-border text-xs rounded-lg p-2 text-zinc-200"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>

              {/* Appointments list */}
              <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-3">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Agendados do Dia</span>
                  <span className="text-[9px] font-bold text-barber-accent-light">{agendamentos.length} cortes</span>
                </div>

                <div className="space-y-2">
                  {agendamentos.length > 0 ? (
                    agendamentos.map((ag) => {
                      const clientName = ag.cliente ? ag.cliente.nome : 'Cliente Desconhecido';
                      const isSelected = selectedClientId === ag.clienteId;

                      return (
                        <div
                          key={ag.id}
                          onClick={() => {
                            if (ag.clienteId) {
                              setSelectedClientId(ag.clienteId);
                              setCurrentView('client-profile');
                            }
                          }}
                          className={`p-3 rounded-lg border text-xs cursor-pointer transition-all space-y-1.5 ${isSelected
                            ? 'bg-zinc-800/80 border-barber-accent'
                            : ag.status === 'Concluído'
                              ? 'bg-emerald-950/10 border-emerald-900/20 opacity-60 hover:opacity-100'
                              : 'bg-barber-dark/30 border-barber-border hover:border-zinc-700'
                            }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-barber-accent flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {formatTime(ag.dataHora)}
                            </span>
                            <span className={`text-[8px] font-bold px-1.5 rounded uppercase ${ag.status === 'Concluído'
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : ag.status === 'Confirmado'
                                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                                : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                              }`}>
                              {ag.status}
                            </span>
                          </div>

                          <span className="font-semibold text-zinc-100 block truncate">{clientName}</span>
                          <div className="flex justify-between items-center text-[10px] text-zinc-500">
                            <span>{ag.servicos}</span>

                            <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                              {ag.status !== 'Concluído' && (
                                <button
                                  onClick={() => handleToggleAppointmentStatus(ag.id, 'Concluído')}
                                  className="text-emerald-500 hover:text-emerald-400 p-0.5"
                                  title="Marcar Concluído"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteAppointment(ag.id)}
                                className="text-red-500 hover:text-red-400 p-0.5"
                                title="Cancelar"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-zinc-650 text-xs">Agenda vazia</div>
                  )}
                </div>
              </div>

              {/* Add schedule */}
              <div className="p-4 border-t border-barber-border bg-barber-card">
                <button
                  onClick={() => {
                    setSelectedClientId(null);
                    setAppointmentForm({ clienteId: '', data: selectedDate, hora: '10:00', servicos: 'Corte' });
                    setAppFormSearch('');
                    setCurrentView('new-appointment');
                  }}
                  className="w-full bg-barber-accent hover:bg-barber-accent-hover text-white py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Agendar Horário
                </button>
              </div>
            </>
          )}

        </aside>

        {/* DESKTOP MAIN AREA */}
        <section className="flex-1 bg-barber-dark flex flex-col h-full overflow-y-auto no-scrollbar relative">

          {/* Case A: Welcome View */}
          {selectedClientId === null && currentView !== 'new-client' && currentView !== 'new-appointment' && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto space-y-6 fade-in font-sans">
              <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700/50">
                <Scissors className="w-8 h-8 text-barber-accent animate-pulse" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-zinc-100">BarberMemo Dashboard</h2>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Painel de controle individual. Logado como <strong className="text-barber-accent-light">{currentUser.nome}</strong>{currentUser.barbeariaName ? ` na barbearia ${currentUser.barbeariaName}` : ''}. Selecione um cliente cadastrado ou clique abaixo para iniciar.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 w-full pt-4 font-sans">
                <div
                  onClick={() => {
                    setClientForm({ nome: '', telefone: '', intervaloDiasRetorno: 20 });
                    setCurrentView('new-client');
                  }}
                  className="bg-barber-card hover:bg-zinc-800/40 border border-barber-border/80 p-4 rounded-xl text-left cursor-pointer transition-colors"
                >
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Clientes</span>
                  <span className="text-xs text-zinc-300 font-semibold mt-1 flex items-center gap-1">
                    <UserPlus className="w-3.5 h-3.5 text-barber-accent-light" />
                    Novo Cliente
                  </span>
                </div>
                <div
                  onClick={() => {
                    setAppointmentForm({ clienteId: '', data: selectedDate, hora: '10:00', servicos: 'Corte' });
                    setAppFormSearch('');
                    setCurrentView('new-appointment');
                  }}
                  className="bg-barber-card hover:bg-zinc-800/40 border border-barber-border/80 p-4 rounded-xl text-left cursor-pointer transition-colors"
                >
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Calendário</span>
                  <span className="text-xs text-zinc-300 font-semibold mt-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-barber-accent-light" />
                    Agendar Horário
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Case B: New Client Form (Desktop) */}
          {currentView === 'new-client' && selectedClientId === null && (
            <div className="p-8 max-w-xl mx-auto w-full space-y-6 fade-in">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-zinc-100 font-sans">Cadastrar Novo Cliente</h2>
                <button onClick={() => setCurrentView('dashboard')} className="text-zinc-500 hover:text-zinc-300 text-xs font-sans">
                  Cancelar
                </button>
              </div>

              <form onSubmit={handleSaveClient} className="bg-barber-card border border-barber-border rounded-2xl p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400">Nome Completo</label>
                  <input
                    type="text" required placeholder="Ex: João Silva"
                    className="w-full bg-barber-dark border border-barber-border rounded-lg py-2.5 px-4 text-xs text-barber-text-primary"
                    value={clientForm.nome} onChange={(e) => setClientForm({ ...clientForm, nome: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400">WhatsApp (com DDD)</label>
                  <input
                    type="tel" required placeholder="Ex: 11988887777"
                    className="w-full bg-barber-dark border border-barber-border rounded-lg py-2.5 px-4 text-xs text-barber-text-primary"
                    value={clientForm.telefone} onChange={(e) => setClientForm({ ...clientForm, telefone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-400 block">Frequência Sugerida de Retorno</label>
                  <div className="flex gap-2">
                    {[15, 20, 25, 30].map((days) => (
                      <button
                        key={days} type="button" onClick={() => setClientForm({ ...clientForm, intervaloDiasRetorno: days })}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${clientForm.intervaloDiasRetorno === days
                          ? 'bg-barber-accent text-white border-barber-accent'
                          : 'bg-barber-dark text-zinc-400 border-barber-border'
                          }`}
                      >
                        {days} dias
                      </button>
                    ))}
                  </div>
                  <input
                    type="number" min="1" placeholder="Dias personalizados"
                    className="w-full bg-barber-dark border border-barber-border rounded-lg py-2.5 px-4 text-xs mt-2"
                    value={clientForm.intervaloDiasRetorno} onChange={(e) => setClientForm({ ...clientForm, intervaloDiasRetorno: parseInt(e.target.value, 10) || '' })}
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setCurrentView('dashboard')} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2.5 rounded-lg text-xs font-bold">
                    Cancelar
                  </button>
                  <button type="submit" className="flex-1 bg-barber-accent hover:bg-barber-accent-hover text-white py-2.5 rounded-lg text-xs font-bold">
                    Salvar Cliente
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Case C: New Appointment Form (Desktop) */}
          {currentView === 'new-appointment' && selectedClientId === null && (
            <div className="p-8 max-w-xl mx-auto w-full space-y-6 fade-in">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-zinc-100 font-sans">Agendar Novo Horário</h2>
                <button onClick={() => setCurrentView('dashboard')} className="text-zinc-500 hover:text-zinc-300 text-xs">
                  Cancelar
                </button>
              </div>

              <form onSubmit={handleSaveAppointment} className="bg-barber-card border border-barber-border rounded-2xl p-6 space-y-4">
                {/* Search Client */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 font-sans">Selecionar Cliente</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 text-zinc-500 w-3.5 h-3.5" />
                    <input
                      type="text" placeholder="Buscar entre meus clientes..."
                      className="w-full bg-barber-dark border border-barber-border rounded-lg py-2 pl-8 pr-4 text-xs text-barber-text-primary"
                      value={appFormSearch} onChange={(e) => setAppFormSearch(e.target.value)}
                    />
                  </div>

                  {/* Select dropdown list */}
                  <div className="bg-barber-dark border border-barber-border rounded-lg max-h-32 overflow-y-auto divide-y divide-barber-border/30 mt-1">
                    {filteredClientsForAppointment.map(c => {
                      const selected = appointmentForm.clienteId === c.id;
                      return (
                        <div
                          key={c.id}
                          onClick={() => {
                            setAppointmentForm({ ...appointmentForm, clienteId: c.id });
                            setAppFormSearch(c.nome);
                          }}
                          className={`p-2 text-xs cursor-pointer flex justify-between items-center transition-colors ${selected ? 'bg-barber-accent/15 text-white' : 'hover:bg-zinc-800/30'
                            }`}
                        >
                          <span>{c.nome}</span>
                          {selected && <Check className="w-3.5 h-3.5 text-barber-accent-light" />}
                        </div>
                      );
                    })}
                    {filteredClientsForAppointment.length === 0 && appFormSearch.trim() !== '' && (
                      <div className="p-3 text-center bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
                        <p className="text-xs text-amber-500">Cliente não encontrado, deseja adicionar à lista de clientes?</p>
                        <button
                          type="button"
                          onClick={() => {
                            setClientForm({ nome: appFormSearch, telefone: '', intervaloDiasRetorno: 20 });
                            setCameFromAppointment(true);
                            setCurrentView('new-client');
                          }}
                          className="text-[10px] font-bold text-white bg-barber-accent hover:bg-barber-accent-hover py-1 px-3 rounded-lg"
                        >
                          Adicionar "{appFormSearch}"
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Date / Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-400">Data do Agendamento</label>
                    <input
                      type="date" required
                      className="w-full bg-barber-dark border border-barber-border rounded-lg py-2.5 px-3 text-xs text-zinc-200"
                      value={appointmentForm.data} onChange={(e) => setAppointmentForm({ ...appointmentForm, data: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-400">Horário</label>
                    <input
                      type="time" required
                      className="w-full bg-barber-dark border border-barber-border rounded-lg py-2.5 px-3 text-xs text-zinc-200"
                      value={appointmentForm.hora} onChange={(e) => setAppointmentForm({ ...appointmentForm, hora: e.target.value })}
                    />
                  </div>
                </div>

                {/* Services */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 block font-sans">Serviços</label>
                  <input
                    type="text" required placeholder="Ex: Corte clássico..."
                    className="w-full bg-barber-dark border border-barber-border rounded-lg py-2 px-3 text-xs text-barber-text-primary"
                    value={appointmentForm.servicos} onChange={(e) => setAppointmentForm({ ...appointmentForm, servicos: e.target.value })}
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {quickPills.agenda.map((pill) => (
                      <button
                        key={pill} type="button" onClick={() => handleAppointmentPillClick(pill)}
                        className="bg-zinc-855 text-[9px] text-zinc-400 px-2 py-0.5 rounded border border-zinc-700 hover:bg-zinc-750"
                      >
                        {pill}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setCurrentView('dashboard')} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2.5 rounded-lg text-xs font-bold">
                    Cancelar
                  </button>
                  <button type="submit" className="flex-1 bg-barber-accent hover:bg-barber-accent-hover text-white py-2.5 rounded-lg text-xs font-bold">
                    Salvar Agendamento
                  </button>
                </div>

              </form>
            </div>
          )}

          {/* Case D: Active Client Details */}
          {selectedClientId !== null && activeClient && (
            <div className="p-6 h-full flex flex-col">

              {/* Profile Header */}
              <div className="flex justify-between items-center border-b border-barber-border/50 pb-4 mb-5">
                <div>
                  <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                    {activeClient.nome}
                    <span className="text-[10px] font-normal bg-zinc-850 text-zinc-400 px-2 py-0.5 rounded border border-zinc-700">
                      CRM ID: {activeClient.id}
                    </span>
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    {activeClient.telefone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setClientForm({ nome: activeClient.nome, telefone: activeClient.telefone, intervaloDiasRetorno: activeClient.intervaloDiasRetorno });
                      setCurrentView('edit-client');
                    }}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-755 text-zinc-300 text-xs font-semibold rounded-lg flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-barber-accent-light" /> Editar Cadastro
                  </button>
                  <button
                    onClick={() => handleDeleteClient(activeClient.id)}
                    className="px-3 py-1.5 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 text-red-455 text-xs font-semibold rounded-lg flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Excluir
                  </button>
                </div>
              </div>

              {/* Workspaces details */}
              <div className="flex-1 grid grid-cols-12 gap-6 min-h-0 overflow-y-auto no-scrollbar pb-6 animate-fadeIn font-sans">

                {/* Profile card */}
                <div className="col-span-4 space-y-4 h-fit sticky top-0">
                  <div className="bg-barber-card border border-barber-border rounded-xl p-4 space-y-4">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Metadados e Alertas</span>

                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Prazo de Retorno</span>
                        <span className="font-semibold text-zinc-300">{activeClient.intervaloDiasRetorno} dias</span>
                      </div>

                      {activeClient.atendimentos.length > 0 ? (
                        (() => {
                          const last = activeClient.atendimentos[0];
                          const diff = new Date() - new Date(last.data);
                          const elapsed = Math.floor(diff / (1000 * 60 * 60 * 24));
                          const isOverdue = elapsed >= activeClient.intervaloDiasRetorno;

                          return (
                            <>
                              <div className="flex justify-between">
                                <span className="text-zinc-500">Última Visita</span>
                                <span className="font-semibold text-zinc-300">{formatDate(last.data)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-zinc-500">Intervalo Decorrido</span>
                                <span className={`font-semibold ${isOverdue ? 'text-amber-500' : 'text-emerald-500'}`}>
                                  {elapsed === 0 ? 'Hoje' : `${elapsed} dias`}
                                </span>
                              </div>
                            </>
                          );
                        })()
                      ) : (
                        <div className="text-amber-500 font-semibold text-[11px]">Nenhum histórico</div>
                      )}
                    </div>

                    {activeClient.atendimentos.length > 0 && (() => {
                      const last = activeClient.atendimentos[0];
                      const diff = new Date() - new Date(last.data);
                      const elapsed = Math.floor(diff / (1000 * 60 * 60 * 24));
                      const isOverdue = elapsed >= (activeClient.intervaloDiasRetorno - 2);

                      if (isOverdue) {
                        return (
                          <div className="pt-2 border-t border-barber-border/30">
                            <button
                              onClick={() => handleWhatsAppReminder(activeClient, { diasPassados: elapsed, ultimoCorte: last })}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
                            >
                              <Phone className="w-3.5 h-3.5 fill-white text-emerald-650" />
                              Lembrar por WhatsApp
                            </button>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  {currentView !== 'new-attendance' && (
                    <button
                      onClick={() => {
                        setAttendanceForm({ laterais: '', topo: '', barba: '', produtos: '' });
                        setSelectedPhotos([]);
                        setCurrentView('new-attendance');
                      }}
                      className="w-full bg-barber-accent hover:bg-barber-accent-hover text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-barber-accent/15"
                    >
                      <Scissors className="w-4 h-4" /> Registrar Atendimento
                    </button>
                  )}
                </div>

                {/* Subview display */}
                <div className="col-span-8 min-h-0">

                  {/* Attendance Form */}
                  {currentView === 'new-attendance' && (
                    <div className="bg-barber-card border border-barber-border rounded-xl p-5 space-y-4 fade-in">
                      <div className="flex justify-between items-center border-b border-barber-border/50 pb-3 mb-2">
                        <span className="font-bold text-sm text-zinc-200">Ficha Técnica do Corte</span>
                        <button onClick={() => setCurrentView('client-profile')} className="text-zinc-550 hover:text-zinc-300 text-xs">
                          Voltar
                        </button>
                      </div>

                      <form onSubmit={handleSaveAttendance} className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-zinc-400 block">Laterais</label>
                          <input
                            type="text" required placeholder="Ex: Degradê na 1..."
                            className="w-full bg-barber-dark border border-barber-border rounded-lg py-2 px-3 text-xs text-barber-text-primary"
                            value={attendanceForm.laterais} onChange={(e) => setAttendanceForm({ ...attendanceForm, laterais: e.target.value })}
                          />
                          <div className="flex flex-wrap gap-1 pt-1">
                            {quickPills.laterais.map((pill) => (
                              <button key={pill} type="button" onClick={() => handlePillClick('laterais', pill)} className="bg-zinc-800 text-[9px] text-zinc-300 px-2 py-0.5 rounded border border-zinc-700 hover:bg-zinc-700">
                                {pill}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-zinc-400 block">Topo</label>
                          <input
                            type="text" placeholder="Ex: Três dedos..."
                            className="w-full bg-barber-dark border border-barber-border rounded-lg py-2 px-3 text-xs text-barber-text-primary"
                            value={attendanceForm.topo} onChange={(e) => setAttendanceForm({ ...attendanceForm, topo: e.target.value })}
                          />
                          <div className="flex flex-wrap gap-1 pt-1">
                            {quickPills.topo.map((pill) => (
                              <button key={pill} type="button" onClick={() => handlePillClick('topo', pill)} className="bg-zinc-800 text-[9px] text-zinc-300 px-2 py-0.5 rounded border border-zinc-700 hover:bg-zinc-700">
                                {pill}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-zinc-400 block">Barba</label>
                          <input
                            type="text" placeholder="Ex: Alinhada..."
                            className="w-full bg-barber-dark border border-barber-border rounded-lg py-2 px-3 text-xs text-barber-text-primary"
                            value={attendanceForm.barba} onChange={(e) => setAttendanceForm({ ...attendanceForm, barba: e.target.value })}
                          />
                          <div className="flex flex-wrap gap-1 pt-1">
                            {quickPills.barba.map((pill) => (
                              <button key={pill} type="button" onClick={() => handlePillClick('barba', pill)} className="bg-zinc-800 text-[9px] text-zinc-300 px-2 py-0.5 rounded border border-zinc-700 hover:bg-zinc-700">
                                {pill}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-zinc-400 block">Produtos Aplicados</label>
                          <input
                            type="text" placeholder="Ex: Pomada matte..."
                            className="w-full bg-barber-dark border border-barber-border rounded-lg py-2 px-3 text-xs text-barber-text-primary"
                            value={attendanceForm.produtos} onChange={(e) => setAttendanceForm({ ...attendanceForm, produtos: e.target.value })}
                          />
                          <div className="flex flex-wrap gap-1 pt-1">
                            {quickPills.produtos.map((pill) => (
                              <button key={pill} type="button" onClick={() => handlePillClick('produtos', pill)} className="bg-zinc-800 text-[9px] text-zinc-300 px-2 py-0.5 rounded border border-zinc-700 hover:bg-zinc-700">
                                {pill}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2 pt-1 border-t border-barber-border/30">
                          <label className="text-xs font-semibold text-zinc-400 block">Fotos do Corte (Máx. 3)</label>
                          <div className="flex gap-2">
                            <label className="w-16 h-16 border border-dashed border-zinc-700 hover:border-barber-accent bg-barber-dark rounded-lg cursor-pointer flex flex-col items-center justify-center">
                              <Camera className="w-4 h-4 text-zinc-500" />
                              <span className="text-[8px] text-zinc-500 font-bold mt-1">Câmera</span>
                              <input
                                type="file" accept="image/*" multiple className="hidden"
                                onChange={handleFileChange} disabled={isCompressing || selectedPhotos.length >= 3}
                              />
                            </label>

                            <div className="flex gap-2">
                              {selectedPhotos.map((src, i) => (
                                <div key={i} className="w-16 h-16 rounded border border-barber-border overflow-hidden relative">
                                  <img src={src} alt="Upload" className="w-full h-full object-cover" />
                                  <button
                                    type="button" onClick={() => removePhoto(i)}
                                    className="absolute top-0.5 right-0.5 bg-red-600 text-white rounded-full p-0.5"
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              ))}
                              {isCompressing && (
                                <div className="w-16 h-16 border border-barber-border rounded bg-zinc-800 flex items-center justify-center">
                                  <div className="w-4 h-4 border border-barber-accent border-t-transparent rounded-full animate-spin"></div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                          <button type="button" onClick={() => setCurrentView('client-profile')} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 rounded text-xs font-bold">
                            Cancelar
                          </button>
                          <button type="submit" disabled={isCompressing} className="flex-1 bg-barber-accent hover:bg-barber-accent-hover text-white py-2 rounded text-xs font-bold disabled:opacity-50">
                            Salvar Ficha do Corte
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Edit Form */}
                  {currentView === 'edit-client' && (
                    <div className="bg-barber-card border border-barber-border rounded-xl p-5 space-y-4 fade-in">
                      <div className="flex justify-between items-center border-b border-barber-border/50 pb-3">
                        <span className="font-bold text-sm text-zinc-200">Editar Cadastro</span>
                        <button onClick={() => setCurrentView('client-profile')} className="text-zinc-555 hover:text-zinc-300 text-xs">
                          Voltar
                        </button>
                      </div>

                      <form onSubmit={handleUpdateClient} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-zinc-400">Nome Completo</label>
                          <input
                            type="text" required
                            className="w-full bg-barber-dark border border-barber-border rounded-lg py-2 px-3 text-xs text-barber-text-primary"
                            value={clientForm.nome} onChange={(e) => setClientForm({ ...clientForm, nome: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-zinc-400">WhatsApp (com DDD)</label>
                          <input
                            type="tel" required
                            className="w-full bg-barber-dark border border-barber-border rounded-lg py-2 px-3 text-xs text-barber-text-primary"
                            value={clientForm.telefone} onChange={(e) => setClientForm({ ...clientForm, telefone: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-zinc-400 block">Intervalo de Retorno (Dias)</label>
                          <div className="flex gap-2">
                            {[15, 20, 25, 30].map((days) => (
                              <button
                                key={days} type="button" onClick={() => setClientForm({ ...clientForm, intervaloDiasRetorno: days })}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border ${clientForm.intervaloDiasRetorno === days
                                  ? 'bg-barber-accent text-white border-barber-accent'
                                  : 'bg-barber-dark text-zinc-400 border-barber-border'
                                  }`}
                              >
                                {days} dias
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                          <button type="button" onClick={() => setCurrentView('client-profile')} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 rounded text-xs font-bold">
                            Cancelar
                          </button>
                          <button type="submit" className="flex-1 bg-barber-accent hover:bg-barber-accent-hover text-white py-2 rounded text-xs font-bold">
                            Salvar Alterações
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Timeline History */}
                  {currentView === 'client-profile' && (
                    <div className="space-y-4">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block px-1">Linha do Tempo</span>

                      {activeClient.atendimentos.length > 0 ? (
                        <div className="relative border-l border-barber-border ml-2 pl-4 space-y-5">
                          {activeClient.atendimentos.map((item) => (
                            <div key={item.id} className="relative">
                              <span className="absolute -left-[22px] top-1.5 w-3 h-3 rounded-full border border-barber-accent bg-barber-dark flex items-center justify-center">
                                <span className="w-1 h-1 rounded-full bg-barber-accent"></span>
                              </span>

                              <div className="bg-barber-card border border-barber-border rounded-xl p-4 space-y-3">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="font-bold text-zinc-200 flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                                    {formatDate(item.data)}
                                  </span>
                                  <span className="text-[9px] font-semibold text-zinc-400 bg-zinc-850 px-2 py-0.5 rounded">
                                    {formatRelativeTime(item.data)}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-1">
                                  {item.laterais && (
                                    <div>
                                      <span className="text-zinc-500 block text-[9px] uppercase font-bold">Laterais</span>
                                      <span className="text-zinc-300 font-medium">{item.laterais}</span>
                                    </div>
                                  )}
                                  {item.topo && (
                                    <div>
                                      <span className="text-zinc-500 block text-[9px] uppercase font-bold">Topo</span>
                                      <span className="text-zinc-300 font-medium">{item.topo}</span>
                                    </div>
                                  )}
                                  {item.barba && (
                                    <div>
                                      <span className="text-zinc-500 block text-[9px] uppercase font-bold">Barba</span>
                                      <span className="text-zinc-300 font-medium">{item.barba}</span>
                                    </div>
                                  )}
                                  {item.produtos && (
                                    <div>
                                      <span className="text-zinc-500 block text-[9px] uppercase font-bold">Produtos</span>
                                      <span className="text-zinc-300 font-medium">{item.produtos}</span>
                                    </div>
                                  )}
                                </div>

                                {item.fotos && item.fotos.length > 0 && (
                                  <div className="pt-2 border-t border-barber-border/20 flex gap-2">
                                    {item.fotos.map((src, i) => (
                                      <div
                                        key={i}
                                        className="w-16 h-16 rounded overflow-hidden border border-barber-border bg-barber-dark cursor-pointer relative group"
                                        onClick={() => setLightboxImage(src)}
                                      >
                                        <img src={src} alt="Corte" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-barber-card border border-barber-border rounded-xl p-8 text-center text-zinc-500">
                          <Scissors className="w-8 h-8 mx-auto mb-2 text-zinc-700" />
                          <p className="text-xs">Nenhum corte registrado ainda.</p>
                          <button
                            onClick={() => {
                              setAttendanceForm({ laterais: '', topo: '', barba: '', produtos: '' });
                              setSelectedPhotos([]);
                              setCurrentView('new-attendance');
                            }}
                            className="mt-3 bg-barber-accent hover:bg-barber-accent-hover text-white px-4 py-2 rounded-lg text-xs font-bold"
                          >
                            Registrar Primeiro Corte
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                </div>

              </div>

            </div>
          )}

        </section>

      </div>

      {/* Lightbox Overlay */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4 fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 bg-zinc-800 text-white rounded-full p-2 hover:bg-zinc-700"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxImage}
            alt="Foto Ampliada"
            className="max-w-full max-h-[85vh] rounded-lg object-contain shadow-2xl"
          />
        </div>
      )}

    </div>
  );
}
