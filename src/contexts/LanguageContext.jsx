import React, { createContext, useContext, useState, useEffect } from 'react';

// Diccionario de Traducciones para la Landing Page
const translations = {
  es: {
    home: {
      admin: "Administración",
      learnPlaying: "Aprende Jugando",
      play: "Juega,",
      learn: "Aprende,",
      win: "Gana.",
      description: "Evaluación interactiva en tiempo real. Compite con tus compañeros, demuestra lo que sabes y diviértete aprendiendo en el aula.",
      mobileTitle: "¡Juega en tu celular! 📱",
      mobileDesc: "Escanea el código con tu cámara para ingresar directo a la sala.",
      studentMode: "Modo Estudiante",
      enterPin: "Ingresar PIN",
      orTeacher: "O si eres profesor",
      teacherMode: "Modo Docente",
      createGame: "Crear Juego",
      footerDesign: "Diseño Gamificado",
      footerAI: "Inteligencia Artificial",
      footerPowered: "Powered by"
    }
  },
  en: {
    home: {
      admin: "Administration",
      learnPlaying: "Learn Playing",
      play: "Play,",
      learn: "Learn,",
      win: "Win.",
      description: "Real-time interactive assessment. Compete with your classmates, show what you know, and have fun learning in the classroom.",
      mobileTitle: "Play on your phone! 📱",
      mobileDesc: "Scan the code with your camera to enter the room directly.",
      studentMode: "Student Mode",
      enterPin: "Enter PIN",
      orTeacher: "Or if you're a teacher",
      teacherMode: "Teacher Mode",
      createGame: "Create Game",
      footerDesign: "Gamified Design",
      footerAI: "Artificial Intelligence",
      footerPowered: "Powered by"
    }
  }
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  // Inicializamos con el idioma guardado en localStorage o 'es' por defecto
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('aula_lang') || 'es';
  });

  useEffect(() => {
    localStorage.setItem('aula_lang', language);
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => (prev === 'es' ? 'en' : 'es'));
  };

  const t = (key) => {
    const keys = key.split('.');
    let result = translations[language];
    for (const k of keys) {
      if (result[k] === undefined) return key; // Fallback a la llave si no existe
      result = result[k];
    }
    return result;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
