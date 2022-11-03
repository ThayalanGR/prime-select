import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { PrimeSelectUsage } from './PrimeSelectUsage';

export default {
    title: 'Prime Select',
    component: PrimeSelectUsage,
    parameters: {
        // More on Story layout: https://storybook.js.org/docs/react/configure/story-layout
        layout: 'fullscreen',
    },
} as ComponentMeta<typeof PrimeSelectUsage>;

const Template: ComponentStory<typeof PrimeSelectUsage> = (args) => <PrimeSelectUsage {...args} />;

export const Usage = Template.bind({});
