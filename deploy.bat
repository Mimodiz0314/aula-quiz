@echo off
title Aula! - Deploy a Vercel
color 0A

echo.
echo  ==========================================
echo   AULA! - Subiendo cambios a la nube...
echo  ==========================================
echo.

cd /d "%~dp0"

echo  [1/2] Guardando cambios en Git...
git add -A
git commit -m "deploy: actualizacion desde script local" 2>nul || echo  (sin cambios nuevos en git)
git push origin main 2>nul

echo.
echo  [2/2] Publicando en Vercel (produccion)...
npx vercel --prod --yes

echo.
echo  ==========================================
echo   Listo! La app esta en linea:
echo   https://aula-quiz.vercel.app
echo  ==========================================
echo.
pause
