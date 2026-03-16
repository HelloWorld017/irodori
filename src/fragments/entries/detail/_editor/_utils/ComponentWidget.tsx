import { WidgetType } from '@codemirror/view';
import type { EditorPortal } from '../_providers/EditorPortalProvider';
import type { EditorView } from '@codemirror/view';
import type { ReactNode } from 'react';

type ComponentWidgetState = {
  element: HTMLElement;
  portalId: string;
  refs: number;
};

type ComponentWidgetProps = {
  id: string;
  render: (view: EditorView) => ReactNode;
  getEstimatedHeight?: () => number;
  portal: EditorPortal;
};

let nextPortalId = 0;

const buildPortalId = () => `component-widget:${nextPortalId++}`;

export class ComponentWidget extends WidgetType {
  private id: string;
  private renderComponent: (view: EditorView) => ReactNode;
  private portal: EditorPortal;
  private state: ComponentWidgetState | null = null;
  private getEstimatedHeight: (() => number) | null = null;

  constructor({ id, render, portal, getEstimatedHeight }: ComponentWidgetProps) {
    super();
    this.id = id;
    this.renderComponent = render;
    this.portal = portal;
    this.getEstimatedHeight = getEstimatedHeight ?? null;
  }

  eq(widget: WidgetType): boolean {
    const isEqual = widget instanceof ComponentWidget && widget.id === this.id;
    if (!isEqual) {
      return false;
    }

    /*
     * This makes `eq` impure.
     * > If you use render or portal, it will certainly have some delay.
     * > And it would make an flickering artifact when user uses the IME,
     * > which will always trigger redraw, regardless of the result of the `eq`.
     *
     * You can use the `renderToStaticMarkup` instead,
     * but this will not be compatible with the `DynamicIcon`.
     *
     * So, by doing a hand-off, this avoids the remounting.
     */
    if (!this.state && widget.state) {
      this.state = widget.state;
    }

    if (!widget.state && this.state) {
      widget.state = this.state;
    }

    return true;
  }

  private ensureState(view: EditorView): ComponentWidgetState {
    if (this.state) {
      return this.state;
    }

    const element = document.createElement('span');
    element.contentEditable = 'false';
    element.style.userSelect = 'none';

    this.state = {
      element,
      portalId: buildPortalId(),
      refs: 0,
    };

    this.updateDOM(element, view);
    return this.state;
  }

  toDOM(view: EditorView): HTMLElement {
    const state = this.ensureState(view);
    state.refs++;
    return state.element;
  }

  updateDOM(dom: HTMLElement, view: EditorView): boolean {
    if (dom !== this.state?.element) {
      return false;
    }

    this.portal.upsertPortal(this.state.portalId, {
      target: dom,
      node: this.renderComponent(view),
    });

    return true;
  }

  ignoreEvent(): boolean {
    return true;
  }

  destroy(): void {
    if (!this.state) {
      return;
    }

    const state = this.state;
    state.refs--;

    setTimeout(() => {
      if (state.refs <= 0) {
        this.portal.removePortal(state.portalId);
        this.state = null;
      }
    }, 50);
  }

  get estimatedHeight() {
    return this.getEstimatedHeight?.() ?? -1;
  }
}
