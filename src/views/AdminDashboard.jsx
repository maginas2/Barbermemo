import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../db';
import {
  Users, BarChart3, Plus, Edit2, Trash2, Mail, Store, User,
  LockKeyhole, LogOut, AlertCircle, ShieldAlert, Calendar,
  UserCheck, Scissors, IdCard, RefreshCw, CheckCircle2, XCircle
} from 'lucide-react';

export default function AdminDashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  // Navigation redirect if not admin
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  const [adminTab, setAdminTab] = useState('barbeiros'); // barbeiros | metrics
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [editingBarberId, setEditingBarberId] = useState(null);
  const [adminBarberForm, setAdminBarberForm] = useState({ nome: '', email: '', senha: '', barbeariaName: '', cpfCnpj: '' });
  const [adminError, setAdminError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);

  // Asaas sync states
  const [syncingBarberId, setSyncingBarberId] = useState(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncAllResult, setSyncAllResult] = useState(null);
  const [syncError, setSyncError] = useState('');

  // CPF/CNPJ formatting helper (accepts either 11 or 14 digits)
  const formatCpfCnpj = (val) => {
    const digits = (val || '').replace(/\D/g, '').slice(0, 14);
    if (digits.length <= 11) {
      return digits
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return digits
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  };

  // Admin Database states
  const [barbeirosList, setBarbeirosList] = useState([]);
  const [adminGlobalStats, setAdminGlobalStats] = useState({
    totalBarbeiros: 0,
    totalClientes: 0,
    totalAtendimentos: 0,
    totalAgendamentos: 0
  });

  const refreshData = useCallback(async () => {
    setIsDataLoading(true);
    try {
      const [barbeiros, globalStats] = await Promise.all([
        db.adminGetBarbeiros(),
        db.adminGetGlobalStats()
      ]);
      setBarbeirosList(barbeiros);
      setAdminGlobalStats(globalStats);
    } catch (error) {
      console.error("Erro ao buscar dados do Supabase:", error);
    } finally {
      setIsDataLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Admin CRUD Actions
  const handleAdminSaveBarber = async (e) => {
    e.preventDefault();
    setAdminError('');
    if (!adminBarberForm.nome.trim() || !adminBarberForm.email.trim() || !adminBarberForm.senha.trim() || !adminBarberForm.barbeariaName.trim()) {
      setAdminError('Preencha todos os campos obrigatórios.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingBarberId) {
        await db.adminUpdateBarbeiro(editingBarberId, adminBarberForm);
      } else {
        await db.adminAddBarbeiro(adminBarberForm);
      }
      // Reset Form
      setAdminBarberForm({ nome: '', email: '', senha: '', barbeariaName: '', cpfCnpj: '' });
      setEditingBarberId(null);
      setShowAdminForm(false);
      await refreshData();
    } catch (err) {
      setAdminError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdminEditClick = (barber) => {
    setAdminBarberForm({
      nome: barber.nome,
      email: barber.email,
      senha: barber.senha || '',
      barbeariaName: barber.barbeariaName,
      cpfCnpj: formatCpfCnpj(barber.cpfCnpj || '')
    });
    setEditingBarberId(barber.id);
    setShowAdminForm(true);
  };

  const handleSyncBarberAsaas = async (barberId) => {
    setSyncError('');
    setSyncingBarberId(barberId);
    try {
      await db.adminSyncBarbeiroAsaas(barberId);
      await refreshData();
    } catch (err) {
      setSyncError(err.message);
    } finally {
      setSyncingBarberId(null);
    }
  };

  const handleSyncAllBarbeirosAsaas = async () => {
    setSyncError('');
    setSyncAllResult(null);
    setSyncingAll(true);
    try {
      const result = await db.adminSyncAllBarbeirosAsaas();
      setSyncAllResult(result);
      await refreshData();
    } catch (err) {
      setSyncError(err.message);
    } finally {
      setSyncingAll(false);
    }
  };

  const handleAdminDeleteClick = async (id) => {
    if (confirm("ATENÇÃO: Deletar este barbeiro excluirá permanentemente todos os clientes cadastrados por ele, suas fichas de cortes, fotos e agendamentos. Deseja prosseguir?")) {
      setIsSaving(true);
      try {
        await db.adminDeleteBarbeiro(id);
        await refreshData();
      } catch (err) {
        console.error("Erro ao deletar barbeiro:", err);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleLogoutClick = async () => {
    await logout();
    navigate('/login');
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen w-full bg-barber-dark text-barber-text-primary flex flex-col font-sans">

      {/* Admin Header */}
      <header className="px-6 py-4 bg-barber-card border-b border-barber-border flex justify-between items-center shadow-md select-none shrink-0">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="Logo" className="w-8 h-8 object-contain rounded-lg" />
          <div>
            <h1 className="text-base font-extrabold tracking-tight flex items-center gap-1.5 font-sans">
              BarberMemo <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[8px] tracking-widest font-black uppercase px-2 py-0.5 rounded">SaaS ADMIN</span>
            </h1>
            <p className="text-[10px] text-zinc-400">Painel Central de Gerenciamento de Barbeiros</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs text-zinc-400 hidden sm:inline">Bem-vindo, <strong>{currentUser.nome}</strong></span>
          <button
            onClick={handleLogoutClick}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-xs font-bold flex items-center gap-1.5 border border-zinc-755 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sair
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row min-h-0">

        {/* Admin Sidebar Navigation */}
        <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-barber-border bg-barber-card/30 p-4 space-y-4 shrink-0">
          <div className="flex md:flex-col gap-2">
            <button
              onClick={() => { setAdminTab('barbeiros'); setShowAdminForm(false); }}
              className={`flex-1 md:flex-none py-2.5 px-4 rounded-xl text-left text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${adminTab === 'barbeiros' ? 'bg-barber-accent text-white shadow-lg shadow-barber-accent/10' : 'text-zinc-400 hover:bg-zinc-850/50 hover:text-zinc-200'
                }`}
            >
              <Users className="w-4 h-4" />
              Gerenciar Barbeiros
            </button>
            <button
              onClick={() => { setAdminTab('metrics'); setShowAdminForm(false); }}
              className={`flex-1 md:flex-none py-2.5 px-4 rounded-xl text-left text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${adminTab === 'metrics' ? 'bg-barber-accent text-white shadow-lg shadow-barber-accent/10' : 'text-zinc-400 hover:bg-zinc-850/50 hover:text-zinc-200'
                }`}
            >
              <BarChart3 className="w-4 h-4" />
              Métricas Globais
            </button>
          </div>

          <div className="hidden md:block pt-4 border-t border-barber-border/30 text-[10px] text-zinc-500 space-y-1.5 px-2 select-none">
            <p>BarberMemo SaaS v1.2</p>
            <p>Segurança: Isolamento Relacional por Barbeiro active.</p>
          </div>
        </aside>

        {/* Admin Main Pane */}
        <main className="flex-1 p-6 overflow-y-auto no-scrollbar">

          {/* VIEW: BARBER LIST & REGISTER */}
          {adminTab === 'barbeiros' && (
            <div className="space-y-6 fade-in max-w-4xl">

              <div className="flex justify-between items-center gap-4 flex-wrap">
                <div>
                  <h2 className="text-lg font-bold text-zinc-100 font-sans">Barbeiros Cadastrados</h2>
                  <p className="text-xs text-zinc-500">Crie, edite e remova credenciais de barbeiros.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSyncAllBarbeirosAsaas}
                    disabled={syncingAll}
                    className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-755 text-zinc-300 text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncingAll ? 'animate-spin' : ''}`} />
                    {syncingAll ? 'Sincronizando...' : 'Sincronizar todos com Asaas'}
                  </button>
                  {!showAdminForm && (
                    <button
                      onClick={() => {
                        setAdminBarberForm({ nome: '', email: '', senha: '', barbeariaName: '', cpfCnpj: '' });
                        setEditingBarberId(null);
                        setAdminError('');
                        setShowAdminForm(true);
                      }}
                      className="bg-barber-accent hover:bg-barber-accent-hover text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 shadow-md shadow-barber-accent/10 transition-all active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Cadastrar Barbeiro
                    </button>
                  )}
                </div>
              </div>

              {syncError && (
                <div className="bg-red-500/10 border border-red-500/25 p-3 rounded-lg flex items-center gap-2 text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{syncError}</span>
                </div>
              )}

              {syncAllResult && (
                <div className="bg-barber-card border border-barber-border rounded-xl p-4 text-xs text-zinc-300 space-y-2 font-sans">
                  <span className="font-bold text-zinc-200">Resultado da sincronização com Asaas</span>
                  <div className="flex gap-4 flex-wrap">
                    <span>Total: <strong>{syncAllResult.total}</strong></span>
                    <span className="text-emerald-500">Criados: <strong>{syncAllResult.criados}</strong></span>
                    <span className="text-sky-455">Atualizados: <strong>{syncAllResult.atualizados}</strong></span>
                    <span className="text-red-455">Falharam: <strong>{syncAllResult.falharam.length}</strong></span>
                  </div>
                  {syncAllResult.falharam.length > 0 && (
                    <ul className="pt-1 border-t border-barber-border/30 space-y-1">
                      {syncAllResult.falharam.map((f) => (
                        <li key={f.barberId} className="text-red-400">{f.nome}: {f.erro}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* FORM: ADD / EDIT BARBER */}
              {showAdminForm && (
                <div className="bg-barber-card border border-barber-border rounded-2xl p-5 space-y-4 shadow-xl">
                  <div className="flex justify-between items-center border-b border-barber-border/40 pb-3">
                    <span className="font-bold text-sm text-zinc-200 font-sans">
                      {editingBarberId ? 'Editar Dados do Barbeiro' : 'Cadastrar Novo Barbeiro no SaaS'}
                    </span>
                    <button
                      onClick={() => { setShowAdminForm(false); setEditingBarberId(null); }}
                      className="text-zinc-500 hover:text-zinc-300 text-xs cursor-pointer"
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
                      <label className="text-[11px] font-bold text-zinc-400 uppercase block font-sans">Nome Completo</label>
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
                      <label className="text-[11px] font-bold text-zinc-400 uppercase block font-sans">Nome da Barbearia</label>
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
                      <label className="text-[11px] font-bold text-zinc-400 uppercase block font-sans">E-mail de Login</label>
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
                      <label className="text-[11px] font-bold text-zinc-400 uppercase block font-sans">Senha de Acesso</label>
                      <div className="relative">
                        <LockKeyhole className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                        <input
                          type="text" required placeholder="Senha provisória"
                          className="w-full bg-barber-dark border border-barber-border rounded-xl py-2.5 pl-9 pr-3 text-xs text-barber-text-primary"
                          value={adminBarberForm.senha} onChange={(e) => setAdminBarberForm({ ...adminBarberForm, senha: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-zinc-400 uppercase block font-sans">CPF/CNPJ (para Asaas)</label>
                      <div className="relative">
                        <IdCard className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                        <input
                          type="text" placeholder="Ex: 123.456.789-00"
                          className="w-full bg-barber-dark border border-barber-border rounded-xl py-2.5 pl-9 pr-3 text-xs text-barber-text-primary"
                          value={adminBarberForm.cpfCnpj}
                          onChange={(e) => setAdminBarberForm({ ...adminBarberForm, cpfCnpj: formatCpfCnpj(e.target.value) })}
                        />
                      </div>
                      <p className="text-[10px] text-zinc-550 font-sans">Necessário para o Asaas emitir cobrança via boleto ou Pix.</p>
                    </div>

                    <div className="md:col-span-2 pt-2 flex gap-3">
                      <button
                        type="button"
                        onClick={() => { setShowAdminForm(false); setEditingBarberId(null); }}
                        className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="flex-1 bg-barber-accent hover:bg-barber-accent-hover text-white py-3 rounded-xl text-xs font-bold transition-all shadow-md shadow-barber-accent/15 cursor-pointer disabled:opacity-50"
                      >
                        {isSaving ? 'Salvando...' : editingBarberId ? 'Salvar Alterações' : 'Confirmar e Cadastrar'}
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
                      <tr className="bg-zinc-950/80 border-b border-barber-border/80 text-[10px] text-zinc-450 uppercase font-bold tracking-wider select-none">
                        <th className="py-3.5 px-4 font-sans">Barbeiro</th>
                        <th className="py-3.5 px-4 font-sans">Barbearia</th>
                        <th className="py-3.5 px-4 font-sans">E-mail de Acesso</th>
                        <th className="py-3.5 px-4 font-sans">Senha</th>
                        <th className="py-3.5 px-4 font-sans">Asaas</th>
                        <th className="py-3.5 px-4 text-center font-sans">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-barber-border/40">
                      {barbeirosList.map((b) => (
                        <tr key={b.id} className="hover:bg-zinc-850/20 transition-colors">
                          <td className="py-4 px-4 font-semibold text-zinc-200 font-sans">{b.nome}</td>
                          <td className="py-4 px-4 text-zinc-400 font-sans">{b.barbeariaName}</td>
                          <td className="py-4 px-4 text-zinc-455 select-all font-mono">{b.email}</td>
                          <td className="py-4 px-4 text-zinc-500 font-mono">{b.senha}</td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              {b.asaasCustomerId ? (
                                <span className="flex items-center gap-1 text-emerald-500 text-[10px] font-bold">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Sincronizado
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-zinc-500 text-[10px] font-bold">
                                  <XCircle className="w-3.5 h-3.5" /> Não sincronizado
                                </span>
                              )}
                              <button
                                onClick={() => handleSyncBarberAsaas(b.id)}
                                disabled={syncingBarberId === b.id}
                                title="Sincronizar com Asaas"
                                className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-barber-accent-light transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${syncingBarberId === b.id ? 'animate-spin' : ''}`} />
                              </button>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleAdminEditClick(b)}
                                className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-barber-accent-light transition-colors cursor-pointer"
                                title="Editar Barbeiro"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleAdminDeleteClick(b.id)}
                                className="p-2 hover:bg-red-950/30 rounded-lg text-red-500 hover:text-red-400 transition-colors cursor-pointer"
                                title="Excluir Barbeiro"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {barbeirosList.length === 0 && !isDataLoading && (
                        <tr>
                          <td colSpan="6" className="py-8 text-center text-zinc-550 font-sans">
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
            <div className="space-y-6 fade-in max-w-4xl">
              <div>
                <h2 className="text-lg font-bold text-zinc-100 font-sans">Visão Geral da Plataforma</h2>
                <p className="text-xs text-zinc-500">Métricas consolidadas de todos os tenants cadastrados.</p>
              </div>

              {/* Global Metrics Cards Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-barber-card border border-barber-border rounded-2xl p-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-barber-accent/10 border border-barber-accent/20 flex items-center justify-center text-barber-accent">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-555 block uppercase font-bold tracking-wider font-sans">Barbeiros Ativos</span>
                    <span className="text-2xl font-black text-zinc-100">{adminGlobalStats.totalBarbeiros}</span>
                  </div>
                </div>

                <div className="bg-barber-card border border-barber-border rounded-2xl p-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-555 block uppercase font-bold tracking-wider font-sans">Clientes Totais</span>
                    <span className="text-2xl font-black text-zinc-100">{adminGlobalStats.totalClientes}</span>
                  </div>
                </div>

                <div className="bg-barber-card border border-barber-border rounded-2xl p-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-455">
                    <Scissors className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-555 block uppercase font-bold tracking-wider font-sans">Cortes Registrados</span>
                    <span className="text-2xl font-black text-zinc-100">{adminGlobalStats.totalAtendimentos}</span>
                  </div>
                </div>

                <div className="bg-barber-card border border-barber-border rounded-2xl p-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-555 block uppercase font-bold tracking-wider font-sans">Agendamentos Marcados</span>
                    <span className="text-2xl font-black text-zinc-100">{adminGlobalStats.totalAgendamentos}</span>
                  </div>
                </div>
              </div>

              {/* System Diagnostics Info */}
              <div className="bg-barber-card border border-barber-border rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-1.5 text-zinc-400 select-none">
                  <ShieldAlert className="w-4 h-4 text-barber-accent" />
                  <span className="text-xs font-bold uppercase tracking-wider font-sans">Diagnóstico de Armazenamento</span>
                </div>
                <div className="h-[1px] bg-barber-border/50"></div>
                <p className="text-xs text-zinc-500 leading-relaxed font-sans">
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
