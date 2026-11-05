import React from 'react';
import {createRoot} from 'react-dom/client';
import StoryBoard from '../src/components/StoryBoard';
createRoot(document.getElementById('root')!).render(<StoryBoard storyId="fixture" storyTitle="Test board" userId="tester"/>);
