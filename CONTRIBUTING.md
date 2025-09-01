# 🤝 Contributing to Image Style Transfer with WebAssembly

Thank you for your interest in contributing to this project! We welcome contributions from everyone.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Style Guidelines](#style-guidelines)
- [Adding New Features](#adding-new-features)
- [Reporting Issues](#reporting-issues)

## 📜 Code of Conduct

This project follows a code of conduct to ensure a welcoming environment for all contributors:

- **Be respectful**: Treat others with respect and kindness
- **Be inclusive**: Welcome people of all backgrounds and experience levels
- **Be collaborative**: Help others learn and grow
- **Be constructive**: Provide helpful feedback and suggestions

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Git
- Basic knowledge of TypeScript/React
- Understanding of image processing concepts (helpful but not required)

### Local Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/Image-Style-Transfer-with-WebAssembly.git
   cd Image-Style-Transfer-with-WebAssembly
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   ```
   http://localhost:3000
   ```

## 🔄 Development Process

### Branch Strategy

- **main**: Production-ready code
- **develop**: Integration branch for features
- **feature/**: New features (`feature/add-new-style`)
- **fix/**: Bug fixes (`fix/image-upload-error`)
- **docs/**: Documentation updates (`docs/update-readme`)

### Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow coding standards
   - Add tests if applicable
   - Update documentation

3. **Test your changes**
   ```bash
   npm run build
   npm run lint
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## 📝 Pull Request Guidelines

### Before Submitting

- [ ] Code builds without errors
- [ ] All existing tests pass
- [ ] New features include appropriate tests
- [ ] Documentation is updated
- [ ] Commit messages follow conventional format

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement

## Testing
- [ ] Tested locally
- [ ] Tested on multiple browsers
- [ ] Added/updated tests

## Screenshots (if applicable)
Add screenshots of UI changes
```

### Review Process

1. **Automated checks** must pass
2. **Code review** by maintainers
3. **Testing** on different browsers/devices
4. **Merge** after approval

## 🎨 Style Guidelines

### TypeScript/JavaScript

```typescript
// Use TypeScript strict mode
interface ComponentProps {
  imageUrl: string
  onProcess: (result: ProcessingResult) => void
}

// Use functional components with hooks
function ImageProcessor({ imageUrl, onProcess }: ComponentProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  
  const handleProcess = useCallback(async () => {
    setIsProcessing(true)
    try {
      const result = await processImage(imageUrl)
      onProcess(result)
    } catch (error) {
      console.error('Processing failed:', error)
    } finally {
      setIsProcessing(false)
    }
  }, [imageUrl, onProcess])
  
  return (
    <button onClick={handleProcess} disabled={isProcessing}>
      {isProcessing ? 'Processing...' : 'Process Image'}
    </button>
  )
}
```

### Code Formatting

- **2 spaces** for indentation
- **Single quotes** for strings
- **No semicolons** (use Standard.js rules)
- **Trailing commas** for multiline objects/arrays

### Component Structure

```typescript
// 1. Imports
import React, { useState, useCallback } from 'react'
import { type ComponentProps } from './types'

// 2. Types/Interfaces
interface LocalProps {
  // ...
}

// 3. Component
export function Component({ prop1, prop2 }: LocalProps) {
  // 4. State
  const [state, setState] = useState()
  
  // 5. Callbacks
  const handleAction = useCallback(() => {
    // ...
  }, [])
  
  // 6. Effects
  useEffect(() => {
    // ...
  }, [])
  
  // 7. Render
  return (
    <div>
      {/* JSX */}
    </div>
  )
}
```

## ✨ Adding New Features

### Adding New Art Styles

1. **Add ONNX model file**
   ```bash
   # Place in public/models/
   public/models/your-new-style.onnx
   ```

2. **Configure model**
   ```typescript
   // src/utils/onnxModels.ts
   export const MODEL_CONFIGS = {
     'your-style': {
       name: "Your Style",
       filename: "your-new-style.onnx",
       description: "Style description",
       inputShape: [1, 512, 512, 3],
       mean: [0.5, 0.5, 0.5],
       std: [0.5, 0.5, 0.5],
       supportedFormats: ["jpg", "png"],
       maxInputSize: 512
     }
   }
   ```

3. **Update UI**
   ```typescript
   // src/app/page.tsx
   <option value="your-style">Your Style Name</option>
   ```

4. **Test thoroughly**
   - Different image sizes
   - Various image types
   - Browser compatibility

### Adding New Components

1. **Create component file**
   ```typescript
   // src/components/YourComponent.tsx
   'use client'
   
   import React from 'react'
   
   interface YourComponentProps {
     // Define props
   }
   
   export function YourComponent({ }: YourComponentProps) {
     return (
       <div>
         {/* Component content */}
       </div>
     )
   }
   ```

2. **Add to index** (if needed)
   ```typescript
   // src/components/index.ts
   export { YourComponent } from './YourComponent'
   ```

3. **Document component**
   ```typescript
   /**
    * YourComponent provides functionality for...
    * 
    * @param prop1 - Description of prop1
    * @param prop2 - Description of prop2
    */
   ```

## 🐛 Reporting Issues

### Bug Reports

Use the bug report template:

```markdown
**Bug Description**
Clear description of the bug

**Steps to Reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What should happen

**Screenshots**
If applicable, add screenshots

**Environment**
- Browser: [e.g. Chrome 91]
- OS: [e.g. Windows 10]
- Device: [e.g. iPhone 12]
```

### Feature Requests

```markdown
**Feature Description**
Clear description of the feature

**Problem it Solves**
What problem does this solve?

**Proposed Solution**
How should it work?

**Alternatives Considered**
Any alternative solutions?
```

## 🧪 Testing

### Manual Testing Checklist

- [ ] Image upload works
- [ ] Preprocessing completes successfully
- [ ] Style transfer produces expected results
- [ ] Download functionality works
- [ ] Copy link feature works
- [ ] UI is responsive on different screen sizes
- [ ] Error handling works properly

### Browser Testing

Test on these browsers:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 📚 Documentation

### Code Documentation

- Use JSDoc comments for functions
- Document complex algorithms
- Explain non-obvious code decisions
- Keep comments up to date

### README Updates

When adding features:
- Update feature list
- Add configuration examples
- Update screenshots if UI changes
- Add to troubleshooting if needed

## 🏆 Recognition

Contributors will be:
- Listed in the project contributors
- Mentioned in release notes for significant contributions
- Invited to join the project team for regular contributors

## 📞 Getting Help

- **GitHub Discussions**: For questions and community support
- **GitHub Issues**: For bug reports and feature requests
- **Email**: yejincc99@gmail.com for direct contact

## 🙏 Thank You

Thank you for contributing to this project! Your help makes this tool better for everyone.

---

Happy coding! 🎨✨
