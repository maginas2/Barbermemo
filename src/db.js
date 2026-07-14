import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper to convert base64 to Blob for Supabase Storage upload
function base64ToBlob(base64, mimeType) {
  const byteCharacters = atob(base64.split(',')[1]);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

// Mappers to transform snake_case database schema to camelCase frontend schema
const mapUser = (u) => {
  if (!u) return null;
  return {
    id: u.id,
    nome: u.nome,
    email: u.email,
    senha: u.senha,
    barbeariaName: u.barbearia_name,
    role: u.role
  };
};

const mapClient = (c) => {
  if (!c) return null;
  return {
    id: c.id,
    nome: c.nome,
    telefone: c.telefone,
    intervaloDiasRetorno: c.intervalo_dias_retorno,
    barberId: c.barber_id
  };
};

const mapAtendimento = (a) => {
  if (!a) return null;
  return {
    id: a.id,
    clienteId: a.cliente_id,
    data: a.data,
    laterais: a.laterais,
    topo: a.topo,
    barba: a.barba,
    produtos: a.produtos,
    fotos: a.fotos || []
  };
};

const mapAgendamento = (ag) => {
  if (!ag) return null;
  return {
    id: ag.id,
    clienteId: ag.cliente_id,
    dataHora: ag.data_hora,
    servicos: ag.servicos,
    status: ag.status,
    barberId: ag.barber_id,
    cliente: ag.clientes ? mapClient(ag.clientes) : undefined
  };
};

export const db = {
  // Authentication APIs
  login: async (email, senha) => {
    const cleanEmail = email.toLowerCase().trim();
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', cleanEmail)
      .eq('senha', senha)
      .maybeSingle();

    if (error) throw error;
    return mapUser(data);
  },

  // Admin APIs
  adminGetBarbeiros: async () => {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('role', 'barbeiro')
      .order('nome', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapUser);
  },

  adminAddBarbeiro: async (barber) => {
    const cleanEmail = barber.email.toLowerCase().trim();
    
    // Check if email already exists
    const { data: existing, error: checkError } = await supabase
      .from('usuarios')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (checkError) throw checkError;
    if (existing) {
      throw new Error("Este e-mail já está cadastrado.");
    }

    const { data, error } = await supabase
      .from('usuarios')
      .insert({
        nome: barber.nome,
        email: cleanEmail,
        senha: barber.senha,
        barbearia_name: barber.barbeariaName,
        role: 'barbeiro'
      })
      .select()
      .single();

    if (error) throw error;
    return mapUser(data);
  },

  adminUpdateBarbeiro: async (id, fields) => {
    const cleanEmail = fields.email.toLowerCase().trim();

    // Check if email is in use by another user
    const { data: existing, error: checkError } = await supabase
      .from('usuarios')
      .select('id')
      .eq('email', cleanEmail)
      .neq('id', id)
      .maybeSingle();

    if (checkError) throw checkError;
    if (existing) {
      throw new Error("Este e-mail já está em uso por outro usuário.");
    }

    const { data, error } = await supabase
      .from('usuarios')
      .update({
        nome: fields.nome,
        email: cleanEmail,
        senha: fields.senha,
        barbearia_name: fields.barbeariaName
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapUser(data);
  },

  adminDeleteBarbeiro: async (id) => {
    const { error } = await supabase
      .from('usuarios')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  adminGetGlobalStats: async () => {
    const [barbeirosRes, clientesRes, atendimentosRes, agendamentosRes] = await Promise.all([
      supabase.from('usuarios').select('id', { count: 'exact', head: true }).eq('role', 'barbeiro'),
      supabase.from('clientes').select('id', { count: 'exact', head: true }),
      supabase.from('atendimentos').select('id', { count: 'exact', head: true }),
      supabase.from('agendamentos').select('id', { count: 'exact', head: true })
    ]);

    if (barbeirosRes.error) throw barbeirosRes.error;
    if (clientesRes.error) throw clientesRes.error;
    if (atendimentosRes.error) throw atendimentosRes.error;
    if (agendamentosRes.error) throw agendamentosRes.error;

    return {
      totalBarbeiros: barbeirosRes.count || 0,
      totalClientes: clientesRes.count || 0,
      totalAtendimentos: atendimentosRes.count || 0,
      totalAgendamentos: agendamentosRes.count || 0
    };
  },

  getClientes: async (barberId, query = '') => {
    const cleanQuery = query.toLowerCase().trim();
    let dbQuery = supabase
      .from('clientes')
      .select('*, atendimentos(id, data, laterais)')
      .eq('barber_id', barberId);

    if (cleanQuery) {
      // In Supabase, if query is present, we can filter using `or` and `ilike`
      dbQuery = dbQuery.or(`nome.ilike.%${cleanQuery}%,telefone.like.%${cleanQuery}%`);
    }

    const { data, error } = await dbQuery.order('nome', { ascending: true });
    if (error) throw error;
    
    return (data || []).map(c => {
      const clientCuts = (c.atendimentos || [])
        .sort((a, b) => new Date(b.data) - new Date(a.data));
      
      const mapped = mapClient(c);
      if (clientCuts.length > 0) {
        mapped.lastCut = mapAtendimento(clientCuts[0]);
      } else {
        mapped.lastCut = null;
      }
      return mapped;
    });
  },

  getCliente: async (barberId, id) => {
    const { data: cliente, error: clientError } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', id)
      .eq('barber_id', barberId)
      .maybeSingle();

    if (clientError) throw clientError;
    if (!cliente) return null;

    const { data: atendimentos, error: atendError } = await supabase
      .from('atendimentos')
      .select('*')
      .eq('cliente_id', id)
      .order('data', { ascending: false });

    if (atendError) throw atendError;

    return {
      ...mapClient(cliente),
      atendimentos: (atendimentos || []).map(mapAtendimento)
    };
  },

  addCliente: async (barberId, cliente) => {
    const { data, error } = await supabase
      .from('clientes')
      .insert({
        nome: cliente.nome,
        telefone: cliente.telefone.replace(/\D/g, ''),
        intervalo_dias_retorno: parseInt(cliente.intervaloDiasRetorno, 10) || 30,
        barber_id: barberId
      })
      .select()
      .single();

    if (error) throw error;
    return mapClient(data);
  },

  updateCliente: async (barberId, id, updatedFields) => {
    const { data, error } = await supabase
      .from('clientes')
      .update({
        nome: updatedFields.nome,
        telefone: updatedFields.telefone ? updatedFields.telefone.replace(/\D/g, '') : undefined,
        intervalo_dias_retorno: updatedFields.intervaloDiasRetorno ? parseInt(updatedFields.intervaloDiasRetorno, 10) : undefined
      })
      .eq('id', id)
      .eq('barber_id', barberId)
      .select()
      .single();

    if (error) throw error;
    return mapClient(data);
  },

  deleteCliente: async (barberId, id) => {
    const { error } = await supabase
      .from('clientes')
      .delete()
      .eq('id', id)
      .eq('barber_id', barberId);

    if (error) throw error;
    return true;
  },

  addAtendimento: async (barberId, atendimento) => {
    // Check if client belongs to this barber
    const { data: client, error: checkErr } = await supabase
      .from('clientes')
      .select('id')
      .eq('id', atendimento.clienteId)
      .eq('barber_id', barberId)
      .maybeSingle();

    if (checkErr) throw checkErr;
    if (!client) throw new Error("Cliente não encontrado ou não pertence a este barbeiro.");

    // Process and upload base64 images to Supabase Storage bucket 'barbermemo-photos'
    const uploadedUrls = [];
    if (atendimento.fotos && atendimento.fotos.length > 0) {
      for (const foto of atendimento.fotos) {
        if (foto.startsWith('data:image')) {
          try {
            const mime = foto.split(';')[0].split(':')[1];
            const blob = base64ToBlob(foto, mime);
            const ext = mime.split('/')[1] || 'jpg';
            const fileName = `${barberId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;
            
            const { error: uploadError } = await supabase.storage
              .from('barbermemo-photos')
              .upload(fileName, blob, { contentType: mime });
            
            if (uploadError) throw uploadError;
            
            const { data: { publicUrl } } = supabase.storage
              .from('barbermemo-photos')
              .getPublicUrl(fileName);
              
            uploadedUrls.push(publicUrl);
          } catch (e) {
            console.error("Erro ao fazer upload da imagem:", e);
          }
        } else {
          uploadedUrls.push(foto);
        }
      }
    }

    const { data: newAtend, error: atendError } = await supabase
      .from('atendimentos')
      .insert({
        cliente_id: atendimento.clienteId,
        laterais: atendimento.laterais || '',
        topo: atendimento.topo || '',
        barba: atendimento.barba || '',
        produtos: atendimento.produtos || '',
        fotos: uploadedUrls
      })
      .select()
      .single();

    if (atendError) throw atendError;

    // Cascade complete today's pending/confirmed appointments
    const todayStr = new Date().toISOString().split('T')[0];
    await supabase
      .from('agendamentos')
      .update({ status: 'Concluído' })
      .eq('cliente_id', atendimento.clienteId)
      .eq('barber_id', barberId)
      .neq('status', 'Concluído')
      .gte('data_hora', `${todayStr}T00:00:00`)
      .lte('data_hora', `${todayStr}T23:59:59`);

    return mapAtendimento(newAtend);
  },

  getProximosRetornos: async (barberId) => {
    // Fetch all clients of this barber and their atendimentos to compute return dates
    const { data: clients, error } = await supabase
      .from('clientes')
      .select('*, atendimentos(id, data)')
      .eq('barber_id', barberId);

    if (error) throw error;

    const list = [];
    
    (clients || []).forEach(cliente => {
      const clientCuts = (cliente.atendimentos || [])
        .sort((a, b) => new Date(b.data) - new Date(a.data));
      
      const mappedCliente = mapClient(cliente);

      if (clientCuts.length === 0) {
        list.push({
          cliente: mappedCliente,
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
      const diasAtrasados = diasPassados - mappedCliente.intervaloDiasRetorno;
      const precisaRetorno = diasPassados >= (mappedCliente.intervaloDiasRetorno - 2);
      
      list.push({
        cliente: mappedCliente,
        diasPassados,
        diasAtrasados,
        precisaRetorno,
        ultimoCorte: {
          id: lastCut.id,
          data: lastCut.data
        }
      });
    });

    return list
      .filter(item => item.precisaRetorno)
      .sort((a, b) => b.diasAtrasados - a.diasAtrasados);
  },

  getAgendamentos: async (barberId, dateString) => {
    const { data, error } = await supabase
      .from('agendamentos')
      .select('*, clientes(*)')
      .eq('barber_id', barberId)
      .gte('data_hora', `${dateString}T00:00:00`)
      .lte('data_hora', `${dateString}T23:59:59`);

    if (error) throw error;
    return (data || []).map(mapAgendamento);
  },

  addAgendamento: async (barberId, agendamento) => {
    const { data, error } = await supabase
      .from('agendamentos')
      .insert({
        cliente_id: agendamento.clienteId,
        data_hora: agendamento.dataHora,
        servicos: agendamento.servicos || 'Corte',
        status: 'Pendente',
        barber_id: barberId
      })
      .select()
      .single();

    if (error) throw error;
    return mapAgendamento(data);
  },

  updateAgendamentoStatus: async (barberId, id, status) => {
    const { data, error } = await supabase
      .from('agendamentos')
      .update({ status: status })
      .eq('id', id)
      .eq('barber_id', barberId)
      .select()
      .single();

    if (error) throw error;
    return mapAgendamento(data);
  },

  deleteAgendamento: async (barberId, id) => {
    const { error } = await supabase
      .from('agendamentos')
      .delete()
      .eq('id', id)
      .eq('barber_id', barberId);

    if (error) throw error;
    return true;
  },

  getStats: async (barberId) => {
    const [clientesRes, atendimentosRes, atendimentosMesRes] = await Promise.all([
      supabase
        .from('clientes')
        .select('id', { count: 'exact', head: true })
        .eq('barber_id', barberId),
      supabase
        .from('atendimentos')
        .select('id, clientes!inner(barber_id)', { count: 'exact', head: true })
        .eq('clientes.barber_id', barberId),
      supabase
        .from('atendimentos')
        .select('id, clientes!inner(barber_id)', { count: 'exact', head: true })
        .eq('clientes.barber_id', barberId)
        .gte('data', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
    ]);

    if (clientesRes.error) throw clientesRes.error;
    if (atendimentosRes.error) throw atendimentosRes.error;
    if (atendimentosMesRes.error) throw atendimentosMesRes.error;

    return {
      totalClientes: clientesRes.count || 0,
      totalAtendimentos: atendimentosRes.count || 0,
      atendimentosMes: atendimentosMesRes.count || 0
    };
  }
};
