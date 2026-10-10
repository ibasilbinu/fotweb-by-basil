/* Streamlit custom-component handshake. No uploads or user records are sent. */
(() => {
  if (window.parent === window) return;
  const send = (type, values = {}) => window.parent.postMessage(
    { isStreamlitMessage: true, type, ...values }, '*'
  );
  const resize = () => {
    const height = Math.max(620, Math.min(1000, window.screen.availHeight - 130));
    send('streamlit:setFrameHeight', { height });
  };
  window.addEventListener('message', event => {
    if (event.source !== window.parent || event.data?.type !== 'streamlit:render') return;
    window.updatePostMatchData?.(event.data.args?.post_match_data);
    resize();
  });
  window.addEventListener('resize', resize);
  send('streamlit:componentReady', { apiVersion: 1 });
  resize();
})();
