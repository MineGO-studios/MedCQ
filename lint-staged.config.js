module.exports = {
    "frontend/**/*.{js,jsx,ts,tsx}": ["eslint --fix", "prettier --write"],
    "frontend/**/*.{json,md}": ["prettier --write"],
    "backend/**/*.py": ["black", "isort"]
  };