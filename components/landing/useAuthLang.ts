'use client'
import { useState, useEffect } from 'react'

export type AuthLang = 'es' | 'en'

const AUTH_T = {
  es: {
    tagline:   'Tu operación, organizada donde estés.',
    copyright: '© 2026 SAFFI · Tu operación, organizada donde estés.',
    // Login
    loginTitle:       'Iniciar sesión',
    emailLabel:       'Correo electrónico',
    emailPlaceholder: 'hola@saffi.app',
    pwdLabel:         'Contraseña',
    forgotPwd:        '¿Olvidaste tu contraseña?',
    remember:         'Recordarme',
    loginBtn:         'Iniciar Sesión',
    loginLoading:     'Iniciando sesión...',
    noAccount:        '¿No tienes cuenta?',
    startFree:        'Empieza gratis',
    // Reset password
    resetTitle:   'Recuperar contraseña',
    resetSub:     'Te enviaremos un enlace a tu correo',
    resetBtn:     'Enviar enlace de recuperación',
    resetSent:    '✓ Revisa tu correo para continuar',
    resetSentSub: 'Haz clic en el enlace para restablecer tu contraseña.',
    backToLogin:  '← Volver al login',
    // Register
    registerTitle:    'Empieza tu prueba gratuita',
    trialBadge:       '10 días gratis',
    noCard:           'Sin tarjeta de crédito',
    cancelAnytime:    'Cancela cuando quieras',
    businessLabel:    'Nombre del negocio',
    businessHolder:   'ej. Miami Car Detailing',
    countryLabel:     'País',
    pwdLabel2:        'Contraseña',
    pwdHolder:        'Mínimo 8 caracteres',
    confirmLabel:     'Confirmar contraseña',
    confirmHolder:    'Repite tu contraseña',
    registerBtn:      'Comenzar prueba gratuita →',
    registerLoading:  'Creando tu cuenta…',
    alreadyHave:      '¿Ya tienes cuenta?',
    loginLink:        'Iniciar sesión',
    // Step 2
    checkEmail:    'Revisa tu email',
    sentTo:        'Te enviamos un enlace de confirmación a',
    activateText:  'Haz clic en el enlace para activar tu cuenta y comenzar tu prueba gratuita de',
    days:          '10 días',
    spamNote:      '¿No llegó el email? Revisa tu carpeta de spam.',
    // Trust strip
    trust1: '✓ 10 días gratis',
    trust2: '✓ Sin tarjeta',
    trust3: '✓ Soporte incluido',
    // Errors
    errFillAll:    'Completa todos los campos',
    errEmail:      'El email es requerido',
    errBusiness:   'El nombre del negocio es requerido',
    errPwdMin:     'La contraseña debe tener mínimo 8 caracteres',
    errPwdMatch:   'Las contraseñas no coinciden',
    errWrongCreds: 'Correo o contraseña incorrectos',
    errReset:      'Error al enviar el correo. Intenta de nuevo.',
    errSetup:      'Error al configurar tu cuenta: ',
    errGeneral:    'Error inesperado: ',
  },
  en: {
    tagline:   'Your operation, organized wherever you are.',
    copyright: '© 2026 SAFFI · Your operation, organized wherever you are.',
    // Login
    loginTitle:       'Log in',
    emailLabel:       'Email',
    emailPlaceholder: 'hello@saffi.app',
    pwdLabel:         'Password',
    forgotPwd:        'Forgot your password?',
    remember:         'Remember me',
    loginBtn:         'Log In',
    loginLoading:     'Logging in...',
    noAccount:        "Don't have an account?",
    startFree:        'Get started',
    // Reset password
    resetTitle:   'Reset password',
    resetSub:     "We'll send a reset link to your email",
    resetBtn:     'Send reset link',
    resetSent:    '✓ Check your email to continue',
    resetSentSub: 'Click the link in the email to reset your password.',
    backToLogin:  '← Back to login',
    // Register
    registerTitle:    'Start your free trial',
    trialBadge:       '10 days free',
    noCard:           'No credit card',
    cancelAnytime:    'Cancel anytime',
    businessLabel:    'Business name',
    businessHolder:   'e.g. Miami Car Detailing',
    countryLabel:     'Country',
    pwdLabel2:        'Password',
    pwdHolder:        'Minimum 8 characters',
    confirmLabel:     'Confirm password',
    confirmHolder:    'Repeat your password',
    registerBtn:      'Start free trial →',
    registerLoading:  'Creating your account…',
    alreadyHave:      'Already have an account?',
    loginLink:        'Log in',
    // Step 2
    checkEmail:    'Check your email',
    sentTo:        'We sent a confirmation link to',
    activateText:  'Click the link to activate your account and start your',
    days:          '10-day free trial',
    spamNote:      "Didn't receive it? Check your spam folder.",
    // Trust strip
    trust1: '✓ 10 days free',
    trust2: '✓ No credit card',
    trust3: '✓ Support included',
    // Errors
    errFillAll:    'Please fill in all fields',
    errEmail:      'Email is required',
    errBusiness:   'Business name is required',
    errPwdMin:     'Password must be at least 8 characters',
    errPwdMatch:   'Passwords do not match',
    errWrongCreds: 'Incorrect email or password',
    errReset:      'Error sending email. Please try again.',
    errSetup:      'Error setting up your account: ',
    errGeneral:    'Unexpected error: ',
  },
}

export type AuthTranslations = typeof AUTH_T.es

export function useAuthLang(): { lang: AuthLang; t: AuthTranslations } {
  const [lang, setLang] = useState<AuthLang>('es')

  useEffect(() => {
    const saved = localStorage.getItem('saffi-landing-lang') as AuthLang | null
    if (saved === 'en' || saved === 'es') setLang(saved)
  }, [])

  return { lang, t: AUTH_T[lang] }
}
