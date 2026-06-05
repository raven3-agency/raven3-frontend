/* ═══════════════════════════════════════════════════
   AUTH — Supabase authentication wrapper
   ═══════════════════════════════════════════════════ */

const Auth = (() => {
  const SB_URL = 'https://tuoovkvocpporpodupxf.supabase.co';
  const SB_KEY = 'sb_publishable_31jetXGeLWVDqs7g5IN-_w_63IHJDSf';

  let _client = null;
  let _user   = null;

  const _sb = () => {
    if (!_client) _client = window.supabase.createClient(SB_URL, SB_KEY);
    return _client;
  };

  const checkSession = async () => {
    const { data: { session } } = await _sb().auth.getSession();
    if (session?.user) { _user = session.user; return true; }
    return false;
  };

  const signIn = async (email, password) => {
    const { data, error } = await _sb().auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    _user = data.user;
    return data.user;
  };

  const signOut = async () => {
    await _sb().auth.signOut();
    _user = null;
    location.reload();
  };

  const getUser = () => _user;

  const getDisplayName = (user) => {
    const email = (user?.email || '').toLowerCase();
    if (email.startsWith('patricio'))      return 'Patricio';
    if (email.startsWith('mariaconstanza')) return 'Constanza';
    const part = email.split('@')[0].split('.')[0];
    return part.charAt(0).toUpperCase() + part.slice(1);
  };

  const getAvatarLetter = (user) => getDisplayName(user).charAt(0).toUpperCase();

  return { checkSession, signIn, signOut, getUser, getDisplayName, getAvatarLetter };
})();
