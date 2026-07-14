// Relational multi-tenant database simulation for BarberMemo MVP
// Data is isolated individually per Barber (barberId)
// Administrative accounts can manage barbers globally

const DB_KEY = 'barbermemo_db';

const daysAgo = (num) => {
  const d = new Date();
  d.setDate(d.getDate() - num);
  return d.toISOString();
};

const getRelativeDateTime = (daysOffset, hour, minute) => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

const defaultSeedData = {
  admins: [
    {
      id: 'admin-1',
      nome: 'SaaS Admin',
      email: 'admin@barbermemo.com',
      senha: 'admin'
    }
  ],
  barbeiros: [
    {
      id: 'barber-1',
      nome: 'Fabricio',
      email: 'fabricio@barber.com',
      senha: '123',
      barbeariaName: 'Confraria do Bigode'
    },
    {
      id: 'barber-2',
      nome: 'Thiago',
      email: 'thiago@barber.com',
      senha: '123',
      barbeariaName: 'Barbearia Imperial'
    }
  ],
  clientes: [
    // Barber 1 Clients
    {
      id: 'c-1',
      nome: 'Carlos Henrique',
      telefone: '11988887777',
      intervaloDiasRetorno: 20,
      barberId: 'barber-1'
    },
    {
      id: 'c-2',
      nome: 'Felipe Bernardes',
      telefone: '21977776666',
      intervaloDiasRetorno: 30,
      barberId: 'barber-1'
    },
    {
      id: 'c-3',
      nome: 'Guilherme Santos',
      telefone: '31966665555',
      intervaloDiasRetorno: 15,
      barberId: 'barber-1'
    },
    {
      id: 'c-4',
      nome: 'Rodrigo Lima',
      telefone: '11955554444',
      intervaloDiasRetorno: 25,
      barberId: 'barber-1'
    },
    {
      id: 'c-5',
      nome: 'Matheus Andrade',
      telefone: '11944443333',
      intervaloDiasRetorno: 30,
      barberId: 'barber-1'
    },
    // Barber 2 Clients
    {
      id: 'c-10',
      nome: 'Renato Silva',
      telefone: '11922221111',
      intervaloDiasRetorno: 30,
      barberId: 'barber-2'
    },
    {
      id: 'c-11',
      nome: 'Claudio Souza',
      telefone: '11933332222',
      intervaloDiasRetorno: 20,
      barberId: 'barber-2'
    }
  ],
  atendimentos: [
    // Barber 1 Cut History
    {
      id: 'a-1',
      clienteId: 'c-1',
      data: daysAgo(22),
      laterais: 'Degradê na 1',
      topo: 'Três dedos texturizado',
      barba: 'Cerrada alinhada',
      produtos: 'Pomada Matte Redken',
      fotos: ['/seed_fade.png', '/seed_beard.png']
    },
    {
      id: 'a-2',
      clienteId: 'c-1',
      data: daysAgo(42),
      laterais: 'Degradê na 1',
      topo: 'Quatro dedos natural',
      barba: 'Alinhada com navalha',
      produtos: 'Pomada Matte Redken',
      fotos: []
    },
    {
      id: 'a-3',
      clienteId: 'c-2',
      data: daysAgo(48),
      laterais: 'Disfarçado Navalhado',
      topo: 'Social alto',
      barba: 'Tamanho médio com óleo',
      produtos: 'Óleo Beard Brand',
      fotos: ['/seed_pompadour.png']
    },
    {
      id: 'a-4',
      clienteId: 'c-3',
      data: daysAgo(5),
      laterais: 'Militar na 2',
      topo: 'Buzzcut texturizado',
      barba: 'Sem barba',
      produtos: 'Sem produto',
      fotos: []
    },
    {
      id: 'a-5',
      clienteId: 'c-4',
      data: daysAgo(26),
      laterais: 'Social na tesoura',
      topo: 'Na tesoura médio',
      barba: 'Cavanhaque desenhado',
      produtos: 'Balm Beard',
      fotos: []
    },
    // Barber 2 Cut History
    {
      id: 'a-10',
      clienteId: 'c-10',
      data: daysAgo(10),
      laterais: 'Degradê Navalhado',
      topo: 'Pompadour',
      barba: 'Cheia alinhada',
      produtos: 'Óleo Beard Brand',
      fotos: ['/seed_pompadour.png']
    }
  ],
  agendamentos: [
    // Barber 1 Appointments
    {
      id: 'ag-1',
      clienteId: 'c-1',
      dataHora: getRelativeDateTime(0, 9, 30),
      servicos: 'Corte + Barba',
      status: 'Pendente',
      barberId: 'barber-1'
    },
    {
      id: 'ag-2',
      clienteId: 'c-2',
      dataHora: getRelativeDateTime(0, 11, 0),
      servicos: 'Corte',
      status: 'Confirmado',
      barberId: 'barber-1'
    },
    {
      id: 'ag-3',
      clienteId: 'c-3',
      dataHora: getRelativeDateTime(0, 15, 0),
      servicos: 'Barba',
      status: 'Concluído',
      barberId: 'barber-1'
    },
    {
      id: 'ag-4',
      clienteId: 'c-4',
      dataHora: getRelativeDateTime(1, 10, 0),
      servicos: 'Corte + Barba',
      status: 'Pendente',
      barberId: 'barber-1'
    },
    {
      id: 'ag-5',
      clienteId: 'c-5',
      dataHora: getRelativeDateTime(1, 16, 30),
      servicos: 'Sobrancelha',
      status: 'Pendente',
      barberId: 'barber-1'
    },
    // Barber 2 Appointments
    {
      id: 'ag-10',
      clienteId: 'c-11',
      dataHora: getRelativeDateTime(0, 13, 0),
      servicos: 'Corte + Barba',
      status: 'Pendente',
      barberId: 'barber-2'
    }
  ]
};

// Initialize database
function initDB() {
  const existing = localStorage.getItem(DB_KEY);
  if (!existing) {
    localStorage.setItem(DB_KEY, JSON.stringify(defaultSeedData));
    return defaultSeedData;
  }
  try {
    const parsed = JSON.parse(existing);
    // Force reset if DB format is older or missing admins collection
    if (!parsed.barbeiros || !parsed.admins) {
      localStorage.setItem(DB_KEY, JSON.stringify(defaultSeedData));
      return defaultSeedData;
    }
    return parsed;
  } catch (e) {
    localStorage.setItem(DB_KEY, JSON.stringify(defaultSeedData));
    return defaultSeedData;
  }
}

function getDB() {
  return initDB();
}

function saveDB(data) {
  localStorage.setItem(DB_KEY, JSON.stringify(data));
}

export const db = {
  // Authentication APIs
  login: (email, senha) => {
    const data = getDB();
    const cleanEmail = email.toLowerCase().trim();
    
    // Check if it's admin first
    const admin = data.admins && data.admins.find(a => a.email.toLowerCase() === cleanEmail && a.senha === senha);
    if (admin) {
      return {
        id: admin.id,
        nome: admin.nome,
        email: admin.email,
        role: 'admin'
      };
    }

    // Check if it's a barber
    const barbeiro = data.barbeiros.find(b => b.email.toLowerCase() === cleanEmail && b.senha === senha);
    if (!barbeiro) return null;
    
    return {
      id: barbeiro.id,
      nome: barbeiro.nome,
      email: barbeiro.email,
      barbeariaName: barbeiro.barbeariaName,
      role: 'barbeiro'
    };
  },

  // Admin APIs
  adminGetBarbeiros: () => {
    const data = getDB();
    return data.barbeiros || [];
  },

  adminAddBarbeiro: (barber) => {
    const data = getDB();
    const cleanEmail = barber.email.toLowerCase().trim();
    
    if (data.barbeiros.some(b => b.email.toLowerCase() === cleanEmail)) {
      throw new Error("Este e-mail de barbeiro já está cadastrado.");
    }
    if (data.admins && data.admins.some(a => a.email.toLowerCase() === cleanEmail)) {
      throw new Error("Este e-mail pertence a uma conta de administrador.");
    }

    const newBarber = {
      id: 'barber-' + Date.now(),
      nome: barber.nome,
      email: cleanEmail,
      senha: barber.senha,
      barbeariaName: barber.barbeariaName
    };

    data.barbeiros.push(newBarber);
    saveDB(data);
    return newBarber;
  },

  adminUpdateBarbeiro: (id, fields) => {
    const data = getDB();
    const idx = data.barbeiros.findIndex(b => b.id === id);
    if (idx === -1) return null;
    
    const cleanEmail = fields.email.toLowerCase().trim();
    if (data.barbeiros.some(b => b.id !== id && b.email.toLowerCase() === cleanEmail)) {
      throw new Error("Este e-mail já está em uso por outro barbeiro.");
    }

    data.barbeiros[idx] = {
      ...data.barbeiros[idx],
      nome: fields.nome,
      email: cleanEmail,
      senha: fields.senha,
      barbeariaName: fields.barbeariaName
    };

    saveDB(data);
    return data.barbeiros[idx];
  },

  adminDeleteBarbeiro: (id) => {
    const data = getDB();
    const exists = data.barbeiros.some(b => b.id === id);
    if (!exists) return false;

    // Filter out barber
    data.barbeiros = data.barbeiros.filter(b => b.id !== id);

    // Cascade delete clients, cuts (atendimentos), and appointments (agendamentos)
    const barberClients = data.clientes.filter(c => c.barberId === id);
    const barberClientIds = new Set(barberClients.map(c => c.id));

    data.clientes = data.clientes.filter(c => c.barberId !== id);
    data.agendamentos = data.agendamentos.filter(ag => ag.barberId !== id);
    data.atendimentos = data.atendimentos.filter(a => !barberClientIds.has(a.clienteId));

    saveDB(data);
    return true;
  },

  adminGetGlobalStats: () => {
    const data = getDB();
    return {
      totalBarbeiros: data.barbeiros.length,
      totalClientes: data.clientes.length,
      totalAtendimentos: data.atendimentos.length,
      totalAgendamentos: data.agendamentos.length
    };
  },

  // Barber APIs
  getClientes: (barberId, query = '') => {
    const data = getDB();
    const cleanQuery = query.toLowerCase().trim();
    const barberClients = data.clientes.filter(c => c.barberId === barberId);
    
    if (!cleanQuery) return barberClients;
    return barberClients.filter(c => 
      c.nome.toLowerCase().includes(cleanQuery) || 
      c.telefone.includes(cleanQuery)
    );
  },

  getCliente: (barberId, id) => {
    const data = getDB();
    const cliente = data.clientes.find(c => c.id === id && c.barberId === barberId);
    if (!cliente) return null;
    const atendimentos = data.atendimentos
      .filter(a => a.clienteId === id)
      .sort((a, b) => new Date(b.data) - new Date(a.data));
    return { ...cliente, atendimentos };
  },

  addCliente: (barberId, cliente) => {
    const data = getDB();
    const newCliente = {
      id: 'c-' + Date.now(),
      nome: cliente.nome,
      telefone: cliente.telefone.replace(/\D/g, ''),
      intervaloDiasRetorno: parseInt(cliente.intervaloDiasRetorno, 10) || 30,
      barberId: barberId
    };
    data.clientes.push(newCliente);
    saveDB(data);
    return newCliente;
  },

  updateCliente: (barberId, id, updatedFields) => {
    const data = getDB();
    const idx = data.clientes.findIndex(c => c.id === id && c.barberId === barberId);
    if (idx === -1) return null;
    data.clientes[idx] = {
      ...data.clientes[idx],
      ...updatedFields,
      telefone: updatedFields.telefone ? updatedFields.telefone.replace(/\D/g, '') : data.clientes[idx].telefone,
      intervaloDiasRetorno: updatedFields.intervaloDiasRetorno ? parseInt(updatedFields.intervaloDiasRetorno, 10) : data.clientes[idx].intervaloDiasRetorno
    };
    saveDB(data);
    return data.clientes[idx];
  },

  deleteCliente: (barberId, id) => {
    const data = getDB();
    const exists = data.clientes.some(c => c.id === id && c.barberId === barberId);
    if (!exists) return false;

    data.clientes = data.clientes.filter(c => c.id !== id);
    data.atendimentos = data.atendimentos.filter(a => a.clienteId !== id);
    data.agendamentos = data.agendamentos.filter(ag => ag.clienteId !== id);
    saveDB(data);
    return true;
  },

  addAtendimento: (barberId, atendimento) => {
    const data = getDB();
    const clientExists = data.clientes.some(c => c.id === atendimento.clienteId && c.barberId === barberId);
    if (!clientExists) return null;

    const newAtendimento = {
      id: 'a-' + Date.now(),
      clienteId: atendimento.clienteId,
      data: new Date().toISOString(),
      laterais: atendimento.laterais || '',
      topo: atendimento.topo || '',
      barba: atendimento.barba || '',
      produtos: atendimento.produtos || '',
      fotos: atendimento.fotos || []
    };
    data.atendimentos.push(newAtendimento);
    
    const todayStr = new Date().toISOString().split('T')[0];
    data.agendamentos = data.agendamentos.map(ag => {
      const agDateStr = new Date(ag.dataHora).toISOString().split('T')[0];
      if (ag.clienteId === atendimento.clienteId && agDateStr === todayStr && ag.status !== 'Concluído' && ag.barberId === barberId) {
        return { ...ag, status: 'Concluído' };
      }
      return ag;
    });

    saveDB(data);
    return newAtendimento;
  },

  getProximosRetornos: (barberId) => {
    const data = getDB();
    const barberClients = data.clientes.filter(c => c.barberId === barberId);
    const list = [];
    
    barberClients.forEach(cliente => {
      const clientCuts = data.atendimentos
        .filter(a => a.clienteId === cliente.id)
        .sort((a, b) => new Date(b.data) - new Date(a.data));
      
      if (clientCuts.length === 0) {
        list.push({
          cliente,
          diasPassados: 999,
          diasAtrasados: 999,
          precisaRetorno: true,
          ultimoCorte: null
        });
        return;
      }
      
      const lastCut = clientCuts[0];
      const timeDiff = new Date() - new Date(lastCut.data);
      const diasPassados = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const diasAtrasados = diasPassados - cliente.intervaloDiasRetorno;
      const precisaRetorno = diasPassados >= (cliente.intervaloDiasRetorno - 2);
      
      list.push({
        cliente,
        diasPassados,
        diasAtrasados,
        precisaRetorno,
        ultimoCorte: lastCut
      });
    });

    return list
      .filter(item => item.precisaRetorno)
      .sort((a, b) => b.diasAtrasados - a.diasAtrasados);
  },

  getAgendamentos: (barberId, dateString) => {
    const data = getDB();
    return data.agendamentos
      .filter(ag => {
        const agDate = new Date(ag.dataHora).toISOString().split('T')[0];
        return agDate === dateString && ag.barberId === barberId;
      })
      .map(ag => {
        const cliente = data.clientes.find(c => c.id === ag.clienteId);
        return { ...ag, cliente };
      })
      .sort((a, b) => new Date(a.dataHora) - new Date(b.dataHora));
  },

  addAgendamento: (barberId, agendamento) => {
    const data = getDB();
    const newAgendamento = {
      id: 'ag-' + Date.now(),
      clienteId: agendamento.clienteId,
      dataHora: agendamento.dataHora,
      servicos: agendamento.servicos || 'Corte',
      status: 'Pendente',
      barberId: barberId
    };
    data.agendamentos.push(newAgendamento);
    saveDB(data);
    return newAgendamento;
  },

  updateAgendamentoStatus: (barberId, id, status) => {
    const data = getDB();
    const idx = data.agendamentos.findIndex(ag => ag.id === id && ag.barberId === barberId);
    if (idx === -1) return null;
    data.agendamentos[idx].status = status;
    saveDB(data);
    return data.agendamentos[idx];
  },

  deleteAgendamento: (barberId, id) => {
    const data = getDB();
    const exists = data.agendamentos.some(ag => ag.id === id && ag.barberId === barberId);
    if (!exists) return false;

    data.agendamentos = data.agendamentos.filter(ag => ag.id !== id);
    saveDB(data);
    return true;
  },

  getStats: (barberId) => {
    const data = getDB();
    const barberClients = data.clientes.filter(c => c.barberId === barberId);
    const totalClientes = barberClients.length;
    
    const barberClientIds = new Set(barberClients.map(c => c.id));
    const barberAtendimentos = data.atendimentos.filter(a => barberClientIds.has(a.clienteId));
    const totalAtendimentos = barberAtendimentos.length;
    
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const atendimentosMes = barberAtendimentos.filter(a => {
      const d = new Date(a.data);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;

    return {
      totalClientes,
      totalAtendimentos,
      atendimentosMes
    };
  }
};
