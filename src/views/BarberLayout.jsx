import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useClientes } from '../hooks/useClientes';
import { useAgendamentos } from '../hooks/useAgendamentos';
import {
  Scissors, LogOut, Search, X, Users, Scissors as CutsIcon,
  TrendingUp, Clock, Plus, Check, UserCheck, Calendar, CalendarDays,
  UserPlus, BarChart3, AlertCircle, Phone, ChevronLeft, Settings, MessageSquare
} from 'lucide-react';

export default function BarberLayout() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Route redirect if not authenticated or not barber
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    } else if (currentUser.role === 'admin') {
      navigate('/admin');
    }
  }, [currentUser, navigate]);

  // Sync date and search queries globally in layout state
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClientId, setSelectedClientId] = useState(null);

  // Initialize hooks with shared layout states
  const {
    clientes,
    proximosRetornos,
    allDbClients,
    stats,
    loading: isClientesLoading,
    refreshClientes,
    addCliente,
    updateCliente,
    deleteCliente,
    addAtendimento
  } = useClientes(currentUser?.id, searchQuery);

  const {
    agendamentos,
    loading: isAgendamentosLoading,
    refreshAgendamentos,
    addAgendamento,
    updateAgendamentoStatus,
    deleteAgendamento
  } = useAgendamentos(currentUser?.id, selectedDate);

  const isDataLoading = isClientesLoading || isAgendamentosLoading;

  // Sidebar Tab sync with current path
  const [sidebarTab, setSidebarTab] = useState('clientes'); // clientes | agenda | metrics
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/agendamentos')) {
      setSidebarTab('agenda');
    } else if (path.startsWith('/metrics')) {
      setSidebarTab('metrics');
    } else {
      setSidebarTab('clientes');
    }
  }, [location.pathname]);

  // Sync active selected client ID from path if it matches /clientes/:id
  useEffect(() => {
    const match = location.pathname.match(/\/clientes\/([a-zA-Z0-9-]+)/);
    if (match && match[1] !== 'novo') {
      setSelectedClientId(match[1]);
    } else {
      setSelectedClientId(null);
    }
  }, [location.pathname]);

  const handleLogoutClick = async () => {
    await logout();
    navigate('/login');
  };

  const handleWhatsAppReminder = (client, item) => {
    const phone = client.telefone.replace(/\D/g, '');
    if (!phone) {
      alert("Telefone inválido.");
      return;
    }
    const text = `Olá, ${client.nome}! Tudo bem? Sentimos sua falta aqui na barbearia. 💈 Faz ${item.diasPassados} dias desde o seu último corte. Que tal darmos aquele trato no visual? Podemos agendar um horário! Abraço!`;
    window.open(`https://api.whatsapp.com/send?phone=55${phone}&text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleToggleAppointmentStatus = async (id, status) => {
    try {
      await updateAgendamentoStatus(id, status);
      await refreshClientes();
    } catch (e) {
      console.error(e);
      alert("Erro ao atualizar status.");
    }
  };

  const handleDeleteAppointment = async (id) => {
    if (confirm("Deseja cancelar/excluir este agendamento?")) {
      try {
        await deleteAgendamento(id);
        await refreshClientes();
      } catch (e) {
        console.error(e);
        alert("Erro ao excluir agendamento.");
      }
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  const formatRelativeTime = (dateString) => {
    if (!dateString) return 'Nenhum corte registrado';
    try {
      const date = new Date(dateString);
      const today = new Date();
      const diffTime = Math.abs(today - date);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Hoje';
      if (diffDays === 1) return 'Ontem';
      return `há ${diffDays} dias`;
    } catch (e) {
      return '';
    }
  };

  if (!currentUser) return null;

  // The context value passed down to all outlets
  const outletContext = {
    currentUser,
    selectedDate,
    setSelectedDate,
    searchQuery,
    setSearchQuery,
    selectedClientId,
    clientes,
    proximosRetornos,
    allDbClients,
    stats,
    agendamentos,
    isDataLoading,
    refreshClientes,
    refreshAgendamentos,
    addCliente,
    updateCliente,
    deleteCliente,
    addAtendimento,
    addAgendamento,
    updateAgendamentoStatus,
    deleteAgendamento
  };

  return (
    <div className="min-h-screen bg-barber-dark text-barber-text-primary flex items-center justify-center font-sans relative w-full">

      {/* ======================================================== */}
      {/* 1. MOBILE LAYOUT (Visible only on screens < md / tablet) */}
      {/* ======================================================== */}
      <div className="block md:hidden w-full max-w-md min-h-screen bg-barber-dark border-x border-barber-border flex flex-col relative shadow-2xl pb-20">

        {/* Header */}
        <header className="px-5 py-4 border-b border-barber-border bg-barber-card/60 backdrop-blur-md sticky top-0 z-10 flex justify-between items-center select-none">
          <div className="flex items-center gap-2" onClick={() => navigate('/dashboard')}>
            <img src="/logo.svg" alt="Logo" className="w-8 h-8 object-contain rounded-lg shadow-md cursor-pointer" />
            <div>
              <h1 className="text-sm font-bold tracking-tight cursor-pointer">BarberMemo</h1>
              <p className="text-[10px] text-barber-text-secondary flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isDataLoading ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                {isDataLoading ? 'Sincronizando...' : `Barbeiro: ${currentUser.nome}`}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => navigate('/settings')}
              className="p-2 bg-barber-light/30 border border-barber-border rounded-lg text-zinc-400 hover:text-white cursor-pointer"
              title="Configurações"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleLogoutClick}
              className="p-2 bg-barber-light/30 border border-barber-border rounded-lg text-zinc-400 hover:text-white cursor-pointer"
              title="Sair"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1">
          <Outlet context={outletContext} />
        </main>

        {/* Bottom tab style navigation (MOBILE) */}
        <div className="fixed bottom-0 left-0 right-0 md:hidden bg-barber-card/85 backdrop-blur-md border-t border-barber-border py-3 px-4 flex justify-around items-center text-zinc-500 text-[10px] z-20 select-none">
          <button
            onClick={() => navigate('/dashboard')}
            className={`flex flex-col items-center gap-1 transition-colors ${location.pathname === '/dashboard' ? 'text-barber-accent font-bold' : 'hover:text-zinc-300'}`}
          >
            <Scissors className="w-4 h-4" />
            Painel
          </button>
          <button
            onClick={() => navigate('/agendamentos')}
            className={`flex flex-col items-center gap-1 transition-colors ${location.pathname === '/agendamentos' ? 'text-barber-accent font-bold' : 'hover:text-zinc-300'}`}
          >
            <Calendar className="w-4 h-4" />
            Agenda
          </button>
          <button
            onClick={() => navigate('/metrics')}
            className={`flex flex-col items-center gap-1 transition-colors ${location.pathname === '/metrics' ? 'text-barber-accent font-bold' : 'hover:text-zinc-300'}`}
          >
            <BarChart3 className="w-4 h-4" />
            Métricas
          </button>
          <button
            onClick={() => navigate('/clientes/novo')}
            className={`flex flex-col items-center gap-1 transition-colors ${location.pathname === '/clientes/novo' ? 'text-barber-accent font-bold' : 'hover:text-zinc-300'}`}
          >
            <UserPlus className="w-4 h-4" />
            Novo
          </button>
        </div>

      </div>

      {/* ======================================================== */}
      {/* 2. DESKTOP LAYOUT (Visible only on screens >= md / tablet) */}
      {/* ======================================================== */}
      <div className="hidden md:flex w-full h-[90vh] max-w-5xl mx-4 bg-barber-card border border-barber-border rounded-2xl shadow-2xl overflow-hidden fade-in relative">

        {/* DESKTOP SIDEBAR (320px width) */}
        <aside className="w-80 border-r border-barber-border flex flex-col h-full bg-barber-card/50 shrink-0">

          {/* Brand header */}
          <div className="px-5 py-4 border-b border-barber-border flex justify-between items-center bg-barber-card select-none">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
              <img src="/logo.svg" alt="Logo" className="w-7 h-7 object-contain rounded-lg shadow-sm" />
              <div className="min-w-0 flex-1">
                <h1 className="text-sm font-bold tracking-tight truncate">{currentUser.barbeariaName || 'Minha Agenda'}</h1>
                <p className="text-[9px] text-zinc-500 truncate flex items-center gap-1">
                  <span className={`w-1 h-1 rounded-full ${isDataLoading ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                  {isDataLoading ? 'Sincronizando...' : `Barbeiro: ${currentUser.nome}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => navigate('/settings')}
                className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors cursor-pointer"
                title="Configurações"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={handleLogoutClick}
                className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors cursor-pointer"
                title="Sair"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sidebar Navigation Selector */}
          <div className="flex bg-zinc-950 p-1 rounded-lg mx-4 my-3 border border-barber-border/80 select-none">
            <button
              onClick={() => navigate('/dashboard')}
              className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${sidebarTab === 'clientes' ? 'bg-barber-accent text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Clientes
            </button>
            <button
              onClick={() => navigate('/agendamentos')}
              className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${sidebarTab === 'agenda' ? 'bg-barber-accent text-white' : 'text-zinc-550 hover:text-zinc-300'}`}
            >
              Agenda
            </button>
            <button
              onClick={() => navigate('/metrics')}
              className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${sidebarTab === 'metrics' ? 'bg-barber-accent text-white' : 'text-zinc-550 hover:text-zinc-300'}`}
            >
              Métricas
            </button>
          </div>

          {/* Render TAB content: CLIENTS */}
          {sidebarTab === 'clientes' && (
            <>
              {/* Stats */}
              <div className="p-4 grid grid-cols-3 gap-2 border-b border-barber-border/30 bg-barber-card/20 select-none">
                <div className="bg-zinc-800/30 rounded-lg p-2 text-center border border-barber-border/30">
                  <span className="text-[9px] text-zinc-505 block font-sans">Clientes</span>
                  <span className="text-xs font-bold text-zinc-200">{stats.totalClientes}</span>
                </div>
                <div className="bg-zinc-800/30 rounded-lg p-2 text-center border border-barber-border/30">
                  <span className="text-[9px] text-zinc-505 block font-sans">Cortes</span>
                  <span className="text-xs font-bold text-zinc-200">{stats.totalAtendimentos}</span>
                </div>
                <div className="bg-zinc-800/30 rounded-lg p-2 text-center border border-barber-border/30">
                  <span className="text-[9px] text-zinc-505 block font-sans">Este Mês</span>
                  <span className="text-xs font-bold text-zinc-200">{stats.atendimentosMes}</span>
                </div>
              </div>

              {/* Search Bar */}
              <div className="p-3 border-b border-barber-border/30">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 text-zinc-500 w-3.5 h-3.5" />
                  <input
                    type="text" placeholder="Buscar cliente..."
                    className="w-full bg-barber-dark border border-barber-border rounded-lg py-2 pl-8 pr-4 text-xs text-barber-text-primary placeholder:text-zinc-600"
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
                    <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest px-1 block select-none font-sans">Alertas de Retorno</span>
                    <div className="space-y-1.5">
                      {proximosRetornos.map((item) => (
                        <div
                          key={item.cliente.id}
                          className={`p-3 rounded-lg border text-xs cursor-pointer transition-all flex flex-col gap-2 ${selectedClientId === item.cliente.id
                            ? 'bg-amber-500/10 border-amber-500/40'
                            : 'bg-amber-500/[0.02] border-amber-500/20 hover:border-amber-500/30'
                            }`}
                          onClick={() => {
                            navigate(`/clientes/${item.cliente.id}`);
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <span className="font-semibold text-zinc-200 truncate pr-1">{item.cliente.nome}</span>
                            <span className="text-[8px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30 px-1 py-0.2 rounded uppercase shrink-0">
                              {item.diasAtrasados > 0 ? `Atrasado ${item.diasAtrasados}d` : 'Hoje'}
                            </span>
                          </div>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleWhatsAppReminder(item.cliente, item);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white py-1 px-2 rounded-md text-[9px] font-bold flex items-center justify-center gap-1 transition-all"
                          >
                            <Phone className="w-2.5 h-2.5 fill-white text-emerald-600" />
                            WhatsApp
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Main list */}
                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest px-1 block select-none">Clientes Cadastrados</span>
                  <div className="space-y-1">
                    {clientes.map((c) => {
                      const isActive = selectedClientId === c.id;
                      return (
                        <div
                          key={c.id}
                          onClick={() => navigate(`/clientes/${c.id}`)}
                          className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${isActive
                            ? 'bg-zinc-800/80 border-barber-border'
                            : 'bg-barber-dark/30 border-transparent hover:border-zinc-800 hover:bg-zinc-850/10'
                            }`}
                        >
                          <span className={`font-semibold block truncate ${isActive ? 'text-white font-bold' : 'text-zinc-300'}`}>{c.nome}</span>
                          <div className="flex justify-between items-center text-[10px] text-zinc-550 mt-1">
                            <span>{c.telefone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')}</span>
                            {c.lastCut && (
                              <span className="text-barber-accent-light text-[9px] font-medium flex items-center gap-0.5">
                                <CutsIcon className="w-2.5 h-2.5" />
                                {formatRelativeTime(c.lastCut.data)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {clientes.length === 0 && (
                      <div className="text-center py-6 text-zinc-650 select-none">Nenhum cliente encontrado</div>
                    )}
                  </div>
                </div>

              </div>

              {/* Add Client button */}
              <div className="p-4 border-t border-barber-border bg-barber-card select-none">
                <button
                  onClick={() => navigate('/clientes/novo')}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 border border-zinc-755 cursor-pointer"
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
              <div className="p-4 border-b border-barber-border/30 bg-barber-card/25 flex flex-col gap-2 select-none">
                <span className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest block">Selecione o Dia</span>
                <input
                  type="date"
                  className="w-full bg-barber-dark border border-barber-border text-xs rounded-lg p-2 text-zinc-200"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>

              {/* Appointments list */}
              <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-3">
                <div className="flex justify-between items-center px-1 select-none">
                  <span className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest">Agendados do Dia</span>
                  <span className="text-[9px] font-bold text-barber-accent-light">{agendamentos.length} cortes</span>
                </div>

                <div className="space-y-2">
                  {agendamentos.map((ag) => {
                    const clientName = ag.cliente ? ag.cliente.nome : 'Cliente Desconhecido';
                    return (
                      <div
                        key={ag.id}
                        onClick={() => {
                          if (ag.clienteId) navigate(`/clientes/${ag.clienteId}`);
                        }}
                        className={`p-3 rounded-lg border text-xs cursor-pointer transition-all space-y-1.5 bg-barber-dark/30 border-barber-border hover:border-zinc-700`}
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
                            {currentUser?.modeloAtendimento === 'fila'
                              ? (ag.status === 'Pendente' ? 'Aguardando' : ag.status === 'Confirmado' ? 'Na Cadeira' : ag.status)
                              : ag.status
                            }
                          </span>
                        </div>

                        <span className="font-semibold text-zinc-100 block truncate">{clientName}</span>
                        <div className="flex justify-between items-center text-[10px] text-zinc-500">
                          <span>{ag.servicos}</span>

                          <div className="flex gap-2 items-center" onClick={e => e.stopPropagation()}>
                            {ag.cliente && ag.cliente.telefone && (
                              <a
                                href={`https://api.whatsapp.com/send?phone=55${ag.cliente.telefone.replace(/\D/g, '')}&text=${encodeURIComponent(
                                  `Olá, ${clientName}! Aqui é o ${currentUser?.nome}${currentUser?.barbeariaName ? ` da ${currentUser.barbeariaName}` : ''}. Estou entrando em contato sobre o seu agendamento no dia ${new Date(ag.dataHora).toLocaleDateString('pt-BR')} às ${formatTime(ag.dataHora)}.`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[9px] bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 px-1.5 py-0.5 rounded transition-all font-semibold cursor-pointer"
                                title="Falar no WhatsApp"
                              >
                                <MessageSquare className="w-3 h-3" />
                                WhatsApp
                              </a>
                            )}
                            {ag.status !== 'Concluído' && (
                              <button
                                onClick={() => {
                                  if (ag.clienteId) {
                                    navigate(`/clientes/${ag.clienteId}/atendimentos/novo`, {
                                      state: { appointmentId: ag.id }
                                    });
                                  }
                                }}
                                className="text-emerald-500 hover:text-emerald-400 p-0.5 cursor-pointer"
                                title="Registrar e Concluir"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteAppointment(ag.id)}
                              className="text-red-500 hover:text-red-400 p-0.5 cursor-pointer"
                              title="Cancelar"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {agendamentos.length === 0 && (
                    <div className="text-center py-8 text-zinc-650 text-xs select-none">Agenda vazia</div>
                  )}
                </div>
              </div>

              {/* Add schedule */}
              <div className="p-4 border-t border-barber-border bg-barber-card select-none">
                <button
                  onClick={() => navigate('/agendamentos/novo')}
                  className="w-full bg-barber-accent hover:bg-barber-accent-hover text-white py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Agendar Horário
                </button>
              </div>
            </>
          )}

          {/* Render TAB content: METRICS SHORTCUT PANEL */}
          {sidebarTab === 'metrics' && (
            <div className="p-4 space-y-4 flex flex-col h-full overflow-y-auto no-scrollbar select-none">
              <div className="flex justify-between items-center px-1">
                <span className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest">Resumo Financeiro</span>
              </div>
              <div className="space-y-3">
                <div className="bg-barber-dark/30 border border-barber-border/80 p-4 rounded-xl">
                  <span className="text-[10px] text-zinc-555 uppercase font-bold block">Relatórios Integrados</span>
                  <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
                    Use o painel ao lado para analisar faturamento diário e mensal, conferir o ticket médio por cliente, acompanhar a taxa de retorno de 30 dias e disparar alertas pós-venda para clientes ausentes.
                  </p>
                </div>
                
                <div className="bg-barber-dark/30 border border-barber-border/80 p-4 rounded-xl flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-555 uppercase font-bold block">Faturamento</span>
                    <span className="text-[11px] font-bold text-zinc-300">Estimativas automáticas</span>
                  </div>
                </div>

                <div className="bg-barber-dark/30 border border-barber-border/80 p-4 rounded-xl flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-555 uppercase font-bold block">Pós-venda</span>
                    <span className="text-[11px] font-bold text-zinc-300">Resgate via WhatsApp</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </aside>

        {/* DESKTOP MAIN AREA */}
        <section className="flex-1 bg-barber-dark flex flex-col h-full overflow-y-auto no-scrollbar relative">
          <Outlet context={outletContext} />
        </section>

      </div>

    </div>
  );
}
