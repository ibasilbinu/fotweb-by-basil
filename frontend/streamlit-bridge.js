/* Streamlit custom-component handshake: only public season data is received. */
(() => {
  if (window.parent === window) return;
  const send = (type, values = {}) => window.parent.postMessage(
    { isStreamlitMessage: true, type, ...values }, '*'
  );
  const resize = () => send('streamlit:setFrameHeight', {
    height: Math.max(620, Math.min(1000, window.screen.availHeight - 130))
  });
  window.addEventListener('message', event => {
    if (event.source !== window.parent || event.data?.type !== 'streamlit:render') return;
    window.receiveSeasonData(event.data.args);
    resize();
  });
  window.addEventListener('resize', resize);
  send('streamlit:componentReady', { apiVersion: 1 });
  resize();
})();
