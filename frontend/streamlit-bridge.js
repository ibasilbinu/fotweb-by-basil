/* Streamlit custom-component handshake: only public season data is received. */
(() => {
  if (window.parent === window) return;
  const send = (type, values = {}) => window.parent.postMessage(
    { isStreamlitMessage: true, type, ...values }, '*'
  );
  const resize = () => send('streamlit:setFrameHeight', {
    // The host fits this frame to 100dvh, including mobile browser chrome and
    // rotation. Do not estimate its size from the device's physical screen.
    height: window.innerHeight
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
