'use strict';
(() => {
  const form = document.getElementById('commission-form');
  if (!form) return;
  const input = document.getElementById('reference-files');
  const list = document.getElementById('reference-list');
  const status = document.getElementById('files-status');
  const errors = document.getElementById('files-error');
  const review = document.getElementById('request-review');
  const feedback = document.getElementById('request-status');
  const shareButton = document.getElementById('share-request');
  const downloadButton = document.getElementById('download-request');
  const fields = form.elements;
  const selected = new Map();
  let prepared = null;
  const maxFile = 25 * 1024 * 1024, maxTotal = 150 * 1024 * 1024;
  const allowed = /\.(jpe?g|png|webp|avif|heic|heif|pdf)$/i;
  const mb = size => (size / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' MB';
  function invalidate() { review.hidden = true; prepared = null; }
  function clearValidation() {
    ['nome', 'contato', 'descricao', 'referencias'].forEach(name => fields.namedItem(name).setCustomValidity(''));
  }
  function renderFiles() {
    list.replaceChildren();
    for (const [key, entry] of selected) {
      const item = document.createElement('li');
      if (entry.url) {
        const photo = document.createElement('img');
        photo.src = entry.url; photo.alt = ''; photo.loading = 'lazy';
        photo.addEventListener('error', () => { photo.hidden = true; }, { once: true });
        item.append(photo);
      }
      const text = document.createElement('div');
      const name = document.createElement('strong'); name.textContent = entry.file.name;
      const size = document.createElement('span'); size.textContent = mb(entry.file.size);
      text.append(name, size);
      const remove = document.createElement('button');
      remove.type = 'button'; remove.textContent = 'Remover';
      remove.setAttribute('aria-label', 'Remover ' + entry.file.name);
      remove.addEventListener('click', () => {
        const buttons = [...list.querySelectorAll('button')];
        const index = buttons.indexOf(remove);
        if (entry.url) URL.revokeObjectURL(entry.url);
        selected.delete(key); invalidate(); clearValidation(); renderFiles();
        const remaining = [...list.querySelectorAll('button')];
        (remaining[Math.min(index, remaining.length - 1)] || input).focus();
      });
      item.append(text, remove); list.append(item);
    }
    const total = [...selected.values()].reduce((sum, entry) => sum + entry.file.size, 0);
    status.textContent = selected.size ? `${selected.size} ${selected.size === 1 ? 'arquivo selecionado' : 'arquivos selecionados'} · ${mb(total)}. Você pode adicionar mais.` : 'Nenhum arquivo selecionado.';
  }
  input.addEventListener('change', () => {
    const issues = [];
    let total = [...selected.values()].reduce((sum, entry) => sum + entry.file.size, 0);
    for (const file of input.files) {
      const key = `${file.name}:${file.size}:${file.lastModified}`;
      if (selected.has(key)) continue;
      if (!allowed.test(file.name)) { issues.push(`${file.name}: escolha uma foto nos formatos indicados ou PDF.`); continue; }
      if (!file.size) { issues.push(`${file.name}: o arquivo está vazio.`); continue; }
      if (file.size > maxFile) { issues.push(`${file.name}: ultrapassa 25 MB. Reduza o arquivo ou envie um link.`); continue; }
      if (total + file.size > maxTotal) { issues.push(`${file.name}: o conjunto ultrapassa 150 MB. Envie os arquivos restantes por um link.`); continue; }
      const previewable = /\.(jpe?g|png|webp|avif)$/i.test(file.name);
      selected.set(key, { file, url: previewable ? URL.createObjectURL(file) : null });
      total += file.size;
    }
    errors.textContent = issues.join('\n'); errors.hidden = !issues.length;
    input.value = ''; clearValidation(); invalidate(); renderFiles();
  });
  form.addEventListener('input', () => { clearValidation(); invalidate(); });
  form.addEventListener('change', () => { clearValidation(); invalidate(); });
  function prepareRequest() {
    clearValidation();
    for (const name of ['nome', 'descricao']) {
      const field = fields.namedItem(name);
      if (!field.value.trim()) field.setCustomValidity('Preencha este campo com as informações do pedido.');
    }
    const contact = fields.namedItem('contato').value.trim();
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
    const digits = contact.replace(/\D/g, '');
    const validPhone = /^[+\d\s().-]+$/.test(contact) && digits.length >= 8 && digits.length <= 15;
    if (!validEmail && !validPhone) fields.namedItem('contato').setCustomValidity('Informe um WhatsApp com DDD ou um e-mail válido.');
    const refs = fields.namedItem('referencias').value.trim();
    if (!selected.size && !refs) fields.namedItem('referencias').setCustomValidity('Adicione ao menos uma foto ou um link de referência para avaliar a construção.');
    if (refs) {
      const validLinks = refs.split(/\r?\n/).filter(line => line.trim()).every(line => {
        try { const url = new URL(line.trim()); return ['https:', 'http:'].includes(url.protocol) && !!url.hostname; } catch { return false; }
      });
      if (!validLinks) fields.namedItem('referencias').setCustomValidity('Cole um endereço completo por linha, começando com https:// ou http://.');
    }
    if (!form.reportValidity()) return null;
    const value = name => fields.namedItem(name).value.trim();
    const files = [...selected.values()].map(entry => entry.file);
    const date = value('data') ? value('data').split('-').reverse().join('/') : 'A combinar';
    const message = `Olá, Samurai! Gostaria de um orçamento para um diorama sob encomenda.\n\nNome: ${value('nome')}\nContato: ${contact}\nConstrução: ${value('construcao')}\nCidade/estado: ${value('local') || 'Não informado'}\nTamanho desejado: ${value('tamanho') || 'A definir com o artista'}\nData desejada (a confirmar): ${date}\n\nHistória e detalhes:\n${value('descricao')}\n\nLinks de referência:\n${refs || 'Referências nos arquivos que vou anexar.'}\n\nArquivos que selecionei: ${files.length}\n${files.map((file, i) => `${i + 1}. ${file.name}`).join('\n')}\n\nSe houver arquivos, vou anexá-los à conversa. Aguardo a avaliação de valor, prazo e viabilidade.`;
    return { message, files };
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    prepared = prepareRequest(); if (!prepared) return;
    document.getElementById('request-message').textContent = prepared.message;
    document.getElementById('review-files').textContent = prepared.files.length ? `${prepared.files.length} referência(s) pronta(s) para baixar ou compartilhar. Os links de envio abaixo levam a mensagem; os arquivos precisam ser anexados.` : 'Os links de referência estão incluídos na mensagem.';
    document.getElementById('request-whatsapp').href = 'https://wa.me/5511969990322?text=' + encodeURIComponent(prepared.message);
    document.getElementById('request-email').href = 'mailto:osamuraiartesao@gmail.com?subject=' + encodeURIComponent('Orçamento de diorama sob encomenda') + '&body=' + encodeURIComponent(prepared.message);
    try { shareButton.hidden = !navigator.canShare?.({ files: shareFiles(prepared) }); } catch { shareButton.hidden = true; }
    feedback.textContent = ''; review.hidden = false; review.focus();
    review.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  });
  function shareFiles(request) { return [new File([request.message], 'pedido-samurai.txt', { type: 'text/plain' }), ...request.files]; }
  document.getElementById('copy-request').addEventListener('click', async () => {
    if (!prepared) return;
    try {
      await navigator.clipboard.writeText(prepared.message);
      feedback.textContent = 'Texto copiado. Cole-o na conversa com o artista e anexe as referências.';
    } catch { feedback.textContent = 'Não foi possível copiar automaticamente. Selecione o texto acima para copiá-lo, ou baixe o pacote com o pedido completo.'; }
  });
  shareButton.addEventListener('click', async () => {
    if (!prepared) return;
    try {
      await navigator.share({ title: 'Pedido de diorama — Samurai Artesão', files: shareFiles(prepared) });
      feedback.textContent = 'Compartilhamento concluído no aplicativo escolhido. Confirme na conversa se todos os arquivos chegaram ao artista.';
    } catch (error) {
      feedback.textContent = error.name === 'AbortError' ? 'Compartilhamento cancelado. Seu pedido continua disponível aqui.' : 'Não foi possível compartilhar os arquivos neste navegador. Baixe o pacote e anexe-o ao WhatsApp ou e-mail.';
    }
  });
  // ZIP sem compressão: mantém as fotos originais e dispensa serviços externos.
  const crcTable = Uint32Array.from({ length: 256 }, (_, n) => {
    for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
    return n >>> 0;
  });
  function crc32(bytes) { let crc = 0xffffffff; for (const b of bytes) crc = crcTable[(crc ^ b) & 255] ^ (crc >>> 8); return (crc ^ 0xffffffff) >>> 0; }
  async function requestZip(request) {
    const encoder = new TextEncoder(), chunks = [], directory = [];
    const entries = [{ name: 'pedido.txt', bytes: encoder.encode(request.message) }, ...request.files.map((file, i) => ({ name: `referencias/${String(i + 1).padStart(3, '0')}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-140)}`, file }))];
    let offset = 0, centralSize = 0;
    for (const entry of entries) {
      const bytes = entry.bytes || new Uint8Array(await entry.file.arrayBuffer());
      const name = encoder.encode(entry.name), crc = crc32(bytes);
      const head = new Uint8Array(30 + name.length), h = new DataView(head.buffer);
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x800, true);
      h.setUint16(12, 33, true); h.setUint32(14, crc, true); h.setUint32(18, bytes.length, true); h.setUint32(22, bytes.length, true); h.setUint16(26, name.length, true); head.set(name, 30);
      const central = new Uint8Array(46 + name.length), c = new DataView(central.buffer);
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x800, true); c.setUint16(14, 33, true); c.setUint32(16, crc, true); c.setUint32(20, bytes.length, true); c.setUint32(24, bytes.length, true); c.setUint16(28, name.length, true); c.setUint32(42, offset, true); central.set(name, 46);
      chunks.push(head, bytes); directory.push(central); offset += head.length + bytes.length; centralSize += central.length;
    }
    const end = new Uint8Array(22), e = new DataView(end.buffer);
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, entries.length, true); e.setUint16(10, entries.length, true); e.setUint32(12, centralSize, true); e.setUint32(16, offset, true);
    return new Blob([...chunks, ...directory, end], { type: 'application/zip' });
  }
  downloadButton.addEventListener('click', async () => {
    if (!prepared) return;
    const snapshot = prepared;
    downloadButton.disabled = true; feedback.textContent = 'Preparando o pacote com seu pedido e os arquivos originais…';
    try {
      const blob = await requestZip(snapshot), url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = 'pedido-samurai-artesao.zip'; document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      feedback.textContent = 'Download iniciado. Anexe pedido-samurai-artesao.zip na conversa com o artista. Se o aplicativo limitar o tamanho, envie as fotos em lotes ou use um link de pasta.';
    } catch { feedback.textContent = 'Não foi possível preparar o pacote. Tente com menos arquivos ou use links de pastas com as referências.'; }
    finally { downloadButton.disabled = false; }
  });
})();
