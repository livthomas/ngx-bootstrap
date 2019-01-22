/**
 * @copyright Valor Software
 * @copyright popper.js team
 */
import {
  computeAutoPlacement,
  getBoundaries,
  getClientRect,
  getOffsetParent,
  getOppositePlacement,
  getOppositeVariation,
  getOuterSizes,
  getPopperOffsets,
  getReferenceOffsets,
  getStyleComputedProperty
} from './utils';

// previous version:`
// https://github.com/angular-ui/bootstrap/blob/07c31d0731f7cb068a1932b8e01d2312b796b4ec/src/position/position.js
// tslint:disable
export class Positioning {

  public position(element: HTMLElement, round = true): ClientRect {
    let elPosition: ClientRect;
    // let parentOffset: ClientRect = {
    //   width: 0,
    //   height: 0,
    //   top: 0,
    //   bottom: 0,
    //   left: 0,
    //   right: 0
    // };
    //
    // if (this.getStyle(element, 'position') === 'fixed') {
    //
    //   const bcRect = element.getBoundingClientRect();
    //   elPosition = {
    //     width: bcRect.width,
    //     height: bcRect.height,
    //     top: bcRect.top,
    //     bottom: bcRect.bottom,
    //     left: bcRect.left,
    //     right: bcRect.right
    //   };
    // } else {
    //   const offsetParentEl = this.offsetParent(element);
    //
    //   elPosition = this.offset(element, false);
    //
    //   if (offsetParentEl !== document.documentElement) {
    //     parentOffset = this.offset(offsetParentEl, false);
    //   }
    //
    //   parentOffset.top += offsetParentEl.clientTop;
    //   parentOffset.left += offsetParentEl.clientLeft;
    // }
    //
    // elPosition.top -= parentOffset.top;
    // elPosition.bottom -= parentOffset.top;
    // elPosition.left -= parentOffset.left;
    // elPosition.right -= parentOffset.left;
    //
    // if (round) {
    //   elPosition.top = Math.round(elPosition.top);
    //   elPosition.bottom = Math.round(elPosition.bottom);
    //   elPosition.left = Math.round(elPosition.left);
    //   elPosition.right = Math.round(elPosition.right);
    // }
    //
    return elPosition;
  }

  preventOverflow(boundariesEl, tooltip, reference, offsetsPopper) {
    let boundariesElement =
      boundariesEl || getOffsetParent(tooltip);

    // If offsetParent is the reference element, we really want to
    // go one step up and use the next offsetParent as reference to
    // avoid to make this modifier completely useless and look like broken
    if (reference === boundariesElement) {
      boundariesElement = getOffsetParent(boundariesElement);
    }

    // NOTE: DOM access here
    // resets the popper's position so that the document size can be calculated excluding
    // the size of the popper element itself
    const transformProp = 'transform';
    const popperStyles = tooltip.style; // assignment to help minification
    const { top, left, [transformProp]: transform } = popperStyles;
    popperStyles.top = '';
    popperStyles.left = '';
    popperStyles[transformProp] = '';

    const boundaries = getBoundaries(
      tooltip,
      reference,
      0, // options.padding
      boundariesElement,
      false // data.positionFixed
    );

    // NOTE: DOM access here
    // restores the original style properties after the offsets have been computed
    popperStyles.top = top;
    popperStyles.left = left;
    popperStyles[transformProp] = transform;

    // options.boundaries = boundaries;

    const order = ['left', 'right', 'top', 'bottom'];
    let popper = offsetsPopper;

    const check = {
      primary(placement) {
        let value = popper[placement];
        if (
          popper[placement] < boundaries[placement] &&
          !false // options.escapeWithReference
        ) {
          value = Math.max(popper[placement], boundaries[placement]);
        }

        return { [placement]: value };
      },
      secondary(placement) {
        const mainSide = placement === 'right' ? 'left' : 'top';
        let value = popper[mainSide];
        if (
          popper[placement] > boundaries[placement] &&
          !false // options.escapeWithReference
        ) {
          value = Math.min(
            popper[mainSide],
            boundaries[placement] -
            (placement === 'right' ? popper.width : popper.height)
          );
        }

        return { [mainSide]: value };
      }
    };

    let side: string;

    order.forEach(placement => {
      side = ['left', 'top']
        .indexOf(placement) !== -1
        ? 'primary'
        : 'secondary';

      popper = { ...popper, ...check[side](placement) };

    });

    offsetsPopper = popper;

    return offsetsPopper;
  }

  shift(offsetsPopper, referenceOffset, placement) {
    const basePlacement = placement.split(' ')[0];
    const shiftvariation = placement.split(' ')[1];

    if (shiftvariation) {
      const isVertical = ['bottom', 'top'].indexOf(basePlacement) !== -1;
      const side = isVertical ? 'left' : 'top';
      const measurement = isVertical ? 'width' : 'height';

      const shiftOffsets = {
        left: { [side]: referenceOffset[side] },
        right: {
          [side]: referenceOffset[side] + referenceOffset[measurement] - offsetsPopper[measurement],
        }
      };

      offsetsPopper = { ...offsetsPopper, ...shiftOffsets[shiftvariation] };
    }

    return offsetsPopper;
  }

  arrow(popper, offsetsPopper, referenceOffset, arrowElement, placement) {
    // if arrowElement is a string, suppose it's a CSS selector
    if (typeof arrowElement === 'string') {
      arrowElement = popper.querySelector(arrowElement);

      // if arrowElement is not found, don't run the modifier
      if (!arrowElement) {
        return;
      }
    } else {
      // if the arrowElement isn't a query selector we must check that the
      // provided DOM node is child of its popper node
      if (!popper.contains(arrowElement)) {
        console.warn(
          'WARNING: `arrow.element` must be child of its popper element!'
        );
        return;
      }
    }

    const isVertical = ['left', 'right'].indexOf(placement) !== -1;

    const len = isVertical ? 'height' : 'width';
    const sideCapitalized = isVertical ? 'Top' : 'Left';
    const side = sideCapitalized.toLowerCase();
    const altSide = isVertical ? 'left' : 'top';
    const opSide = isVertical ? 'bottom' : 'right';
    const arrowElementSize = getOuterSizes(arrowElement)[len];

    // let resOffsetsPopper = {};

    //
    // extends keepTogether behavior making sure the popper and its
    // reference have enough pixels in conjunction
    //

    // top/left side
    if (referenceOffset[opSide] - arrowElementSize < offsetsPopper[side]) {
      offsetsPopper[side] -=
        offsetsPopper[side] - (referenceOffset[opSide] - arrowElementSize);
    }
    // bottom/right side
    if (referenceOffset[side] + arrowElementSize > offsetsPopper[opSide]) {
      offsetsPopper[side] +=
        referenceOffset[side] + arrowElementSize - offsetsPopper[opSide];
    }
    offsetsPopper = getClientRect(offsetsPopper);

    // compute center of the popper
    const center = referenceOffset[side] + referenceOffset[len] / 2 - arrowElementSize / 2;

    // Compute the sideValue using the updated popper offsets
    // take popper margin in account because we don't have this info available
    const css = getStyleComputedProperty(popper);

    const popperMarginSide = parseFloat(css[`margin${sideCapitalized}`]);
    const popperBorderSide = parseFloat(css[`border${sideCapitalized}Width`]);
    let sideValue =
      center - offsetsPopper[side] - popperMarginSide - popperBorderSide;

    // prevent arrowElement from being placed not contiguously to its popper
    sideValue = Math.max(Math.min(offsetsPopper[len] - arrowElementSize, sideValue), 0);

    const offsetsArrow = {
      [side]: Math.round(sideValue),
      [altSide]: '', // make sure to unset any eventual altSide value from the DOM node
    };

    offsetsArrow.arrowElement = arrowElement;

    arrowElement.style.top = `${offsetsArrow.top}px`;
    arrowElement.style.left = `${offsetsArrow.left}px`;

    return offsetsArrow;
  }

  flip(boundariesEl, tooltip, reference, offsetsPopper, referenceOffsets, inputPlacement) {
    let boundariesElement =
      boundariesEl || getOffsetParent(tooltip);

    const boundaries = getBoundaries(
      tooltip,
      reference,
      5, // options.padding
      boundariesElement,
      false // data.positionFixed
    );

    let placement = inputPlacement.split('-')[0];
    let placementOpposite = getOppositePlacement(placement);
    let variation = inputPlacement.split('-')[1] || '';

    let flipOrder = [];

    flipOrder = [placement, placementOpposite];

    let popperOffsets = offsetsPopper;
    // popperOffsets.right = 0;

    let refOffsets = referenceOffsets;

    /* tslint:disable-next-line: cyclomatic-complexity */
    flipOrder.forEach((step, index) => {
      if (placement !== step || flipOrder.length === index + 1) {
        return placement;
      }

      placement = inputPlacement.split('-')[0];
      placementOpposite = getOppositePlacement(placement);

      // using floor because the reference offsets may contain decimals we are not going to consider here
      const floor = Math.floor;
      const overlapsRef =
        (placement === 'left' &&
          floor(popperOffsets.right) > floor(refOffsets.left)) ||
        (placement === 'right' &&
          floor(popperOffsets.left) < floor(refOffsets.right)) ||
        (placement === 'top' &&
          floor(popperOffsets.bottom) > floor(refOffsets.top)) ||
        (placement === 'bottom' &&
          floor(popperOffsets.top) < floor(refOffsets.bottom));

      const overflowsLeft = floor(popperOffsets.left) < floor(boundaries.left);
      const overflowsRight = floor(popperOffsets.right) > floor(boundaries.right);
      const overflowsTop = floor(popperOffsets.top) < floor(boundaries.top);
      const overflowsBottom = floor(popperOffsets.bottom) > floor(boundaries.bottom);

      const overflowsBoundaries =
        (placement === 'left' && overflowsLeft) ||
        (placement === 'right' && overflowsRight) ||
        (placement === 'top' && overflowsTop) ||
        (placement === 'bottom' && overflowsBottom);

      // flip the variation if required
      const isVertical = ['top', 'bottom'].indexOf(placement) !== -1;
      const flippedVariation =
        ((isVertical && variation === 'start' && overflowsLeft) ||
          (isVertical && variation === 'end' && overflowsRight) ||
          (!isVertical && variation === 'start' && overflowsTop) ||
          (!isVertical && variation === 'end' && overflowsBottom));

      if (overlapsRef || overflowsBoundaries || flippedVariation) {
        // this boolean to detect any flip loop
        // data.flipped = true;

        if (overlapsRef || overflowsBoundaries) {
          placement = flipOrder[index + 1];
        }

        if (flippedVariation) {
          variation = getOppositeVariation(variation);
        }

        placement = placement + (variation ? `-${variation}` : '');

        popperOffsets = {
          ...popperOffsets,
          ...getPopperOffsets(
            tooltip,
            refOffsets,
            placement
          )
        };
      }

      tooltip.className = tooltip.className.replace(/bs-popover-\w*/g, `bs-popover-${placement}`);
      tooltip.className = tooltip.className.replace(/bs-tooltip-\w*/g, `bs-tooltip-${placement}`);
    });

    return popperOffsets;
  }


  public positionElements(
    hostElement: HTMLElement,   // button or reference
    targetElement: HTMLElement, // tooltip or popper
    placement: string,
    appendToBody?: boolean
  ): ClientRect {

    const referenceOffsets = getReferenceOffsets({}, targetElement, hostElement);
    const autoPlacement = computeAutoPlacement(
      placement,
      referenceOffsets,
      targetElement,
      hostElement,
      'viewport',
      0
    );

    let popperOffsets: any = getPopperOffsets(targetElement, referenceOffsets, autoPlacement);

    popperOffsets = getClientRect(popperOffsets);

    popperOffsets = this.flip('viewport', targetElement, hostElement, popperOffsets, referenceOffsets, placement);

    popperOffsets = this.preventOverflow('scrollParent', targetElement, hostElement, popperOffsets);

    const arrowOffsets = this.arrow(targetElement, popperOffsets, referenceOffsets, '.arrow', placement);

    popperOffsets = this.shift(popperOffsets, referenceOffsets, placement);

    // const hostElPosition = appendToBody
    //   ? this.offset(hostElement, false)
    //   : this.position(hostElement, false);
    // const targetElStyles = this.getAllStyles(targetElement);
    // const targetElBCR = targetElement.getBoundingClientRect();
    // let placementPrimary = placement.split(' ')[0] || 'top';
    // const placementSecondary = placement.split(' ')[1] || 'center';

    let targetElPosition: any = {
      height: 0,
      width: 0,
      top: 0,
      bottom: 0,
      left: 0,
      right: 0
    };

    targetElPosition.top = Math.round(popperOffsets.top);
    targetElPosition.left = Math.round(popperOffsets.left);
    targetElPosition.bottom = Math.round(popperOffsets.bottom);
    targetElPosition.right = Math.round(popperOffsets.right);

    // const offsetParent = getOffsetParent(hostElement);

    const offsets: any = {
      width: popperOffsets.width,
      height: popperOffsets.height,
      left: Math.floor(popperOffsets.left),
      top: Math.round(popperOffsets.top),
      bottom: Math.round(popperOffsets.bottom),
      right: Math.floor(popperOffsets.right)
    };

    return offsets;
  }
}

const positionService = new Positioning();

export function positionElements(
  hostElement: HTMLElement,
  targetElement: HTMLElement,
  placement: string,
  appendToBody?: boolean
): void {
  const pos = positionService.positionElements(
    hostElement,
    targetElement,
    placement,
    appendToBody
  );

  targetElement.style['will-change'] = 'transform';
  targetElement.style.top = '0px';
  targetElement.style.left = '0px';
  targetElement.style.transform = `translate3d(${pos.left}px, ${pos.top}px, 0px)`;
  // targetElement.style.top = `${pos.top}px`;
  // targetElement.style.left = `${pos.left}px`;
}
