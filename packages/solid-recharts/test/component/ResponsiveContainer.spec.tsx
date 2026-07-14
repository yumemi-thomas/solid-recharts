import { createEffect, createSignal } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@solidjs/testing-library";
import { ResponsiveContainer, useResponsiveContainerContext } from "../../src";
import { mockGetBoundingClientRect } from "../helper/mockGetBoundingClientRect";
import { assertNotNull } from "../helper/assertNotNull";

/*
 * Ported from recharts 3.8.1 test/component/ResponsiveContainer.spec.tsx.
 * Solid adaptations: className -> class, ref prop instead of forwardRef, and
 * React rerender -> signal update.
 */

declare global {
  interface Window {
    ResizeObserver: typeof ResizeObserver;
  }
}

describe("<ResponsiveContainer />", () => {
  let notifyResizeObserverChange: (arg: ResizeObserverEntry[]) => void;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let resizeObserverMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    resizeObserverMock = vi.fn(function ResizeObserverMock(
      callback: (arg: ResizeObserverEntry[]) => void,
    ) {
      notifyResizeObserverChange = callback;

      return {
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
      };
    });
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation((): void => undefined);

    window.ResizeObserver = resizeObserverMock;
  });

  afterEach(() => {
    vi.useRealTimers();
    consoleWarnSpy.mockRestore();
  });

  const DimensionSpy = (props: { backgroundColor?: string }) => {
    const size = useResponsiveContainerContext();
    return <div data-testid="inside" style={dimensionStyle(size, props.backgroundColor)} />;
  };

  function dimensionStyle(
    size: ReturnType<typeof useResponsiveContainerContext>,
    backgroundColor?: string,
  ): string {
    const parts = [
      size == null ? undefined : `width: ${size.width}px`,
      size == null ? undefined : `height: ${size.height}px`,
      backgroundColor == null ? undefined : `background-color: ${backgroundColor}`,
    ];
    return parts.filter((part): part is string => part != null).join("; ");
  }

  it("Render a wrapper container in ResponsiveContainer", () => {
    const { container } = render(() => (
      <ResponsiveContainer>
        <DimensionSpy />
      </ResponsiveContainer>
    ));

    expect(container.querySelector(".recharts-responsive-container")).toBeTruthy();
    expect(consoleWarnSpy).toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.any(String));
  });

  it("Renders with minHeight and minWidth when provided", () => {
    const { container } = render(() => (
      <ResponsiveContainer minWidth={200} minHeight={100}>
        <DimensionSpy />
      </ResponsiveContainer>
    ));

    expect(container.querySelector(".recharts-responsive-container")).toHaveStyle({
      minWidth: "200px",
      minHeight: "100px",
    });
  });

  it("Renders the component inside", () => {
    render(() => (
      <ResponsiveContainer minWidth={200} minHeight={100}>
        <DimensionSpy />
      </ResponsiveContainer>
    ));

    notifyResizeObserverChange([
      { contentRect: { width: 100, height: 100 } } as ResizeObserverEntry,
    ]);
    expect(screen.getByTestId("inside")).toBeInTheDocument();
  });

  it("should ignore height completely if aspect+width are defined", () => {
    render(() => (
      <ResponsiveContainer height={Math.random() * 1000} aspect={2} width={300}>
        <DimensionSpy />
      </ResponsiveContainer>
    ));

    expect(screen.getByTestId("inside")).toHaveStyle({ width: "300px", height: "150px" });
  });

  it("should calculate width from aspect+height if width=0", () => {
    render(() => (
      <ResponsiveContainer height={300} aspect={2} width={0}>
        <DimensionSpy />
      </ResponsiveContainer>
    ));

    expect(screen.getByTestId("inside")).toHaveStyle({ width: "600px", height: "300px" });
  });

  it("Preserves aspect ratio when oversized", () => {
    render(() => (
      <ResponsiveContainer aspect={2} height={100} width={300}>
        <DimensionSpy />
      </ResponsiveContainer>
    ));

    expect(screen.getByTestId("inside")).toHaveStyle({ width: "300px", height: "150px" });
  });

  it("Preserves aspect ratio when undersized", () => {
    render(() => (
      <ResponsiveContainer aspect={2} height={300} width={100}>
        <DimensionSpy />
      </ResponsiveContainer>
    ));

    expect(screen.getByTestId("inside")).toHaveStyle({ width: "100px", height: "50px" });
  });

  it("Renders without an id attribute when not passed", () => {
    const { container } = render(() => (
      <ResponsiveContainer>
        <DimensionSpy />
      </ResponsiveContainer>
    ));

    expect(container.querySelector(".recharts-responsive-container")).not.toHaveAttribute("id");
  });

  it("Renders with id attribute when passed", () => {
    const { container } = render(() => (
      <ResponsiveContainer id="testing-id-attr">
        <DimensionSpy />
      </ResponsiveContainer>
    ));

    expect(container.querySelector(".recharts-responsive-container")).toHaveAttribute(
      "id",
      "testing-id-attr",
    );
  });

  it("should resize when ResizeObserver notify a change", () => {
    render(() => (
      <ResponsiveContainer width="100%" height={200}>
        <DimensionSpy />
      </ResponsiveContainer>
    ));

    notifyResizeObserverChange([{ contentRect: { width: 10, height: 10 } } as ResizeObserverEntry]);
    const testDivBefore = screen.getByTestId("inside");
    assertNotNull(testDivBefore);
    expect(testDivBefore).toHaveStyle({ width: "10px", height: "200px" });

    notifyResizeObserverChange([
      { contentRect: { width: 100, height: 100 } } as ResizeObserverEntry,
    ]);
    const testDivAfter = screen.getByTestId("inside");
    assertNotNull(testDivAfter);
    expect(testDivAfter).toHaveStyle({ width: "100px", height: "200px" });
  });

  it("should resize when debounced", () => {
    vi.useFakeTimers();
    render(() => (
      <ResponsiveContainer width="100%" height={200} debounce={200}>
        <DimensionSpy />
      </ResponsiveContainer>
    ));

    notifyResizeObserverChange([{ contentRect: { width: 10, height: 10 } } as ResizeObserverEntry]);
    vi.advanceTimersByTime(300);
    const testDivBefore = screen.getByTestId("inside");
    assertNotNull(testDivBefore);
    expect(testDivBefore).toHaveStyle({ width: "10px", height: "200px" });

    notifyResizeObserverChange([{ contentRect: { width: 50, height: 50 } } as ResizeObserverEntry]);

    const testDivInBetween = screen.getByTestId("inside");
    assertNotNull(testDivInBetween);
    expect(testDivInBetween).toHaveStyle({ width: "10px", height: "200px" });

    vi.advanceTimersByTime(100);
    const testDivAfter100ms = screen.getByTestId("inside");
    assertNotNull(testDivAfter100ms);
    expect(testDivAfter100ms).toHaveStyle({ width: "10px", height: "200px" });

    vi.advanceTimersByTime(100);
    const testDivAfter = screen.getByTestId("inside");
    assertNotNull(testDivAfter);
    expect(testDivAfter).toHaveStyle({ width: "50px", height: "200px" });
  });

  it("should call onResize when ResizeObserver notifies one or many changes", () => {
    const onResize = vi.fn();

    render(() => (
      <ResponsiveContainer width="100%" height={200} onResize={onResize}>
        <DimensionSpy />
      </ResponsiveContainer>
    ));

    notifyResizeObserverChange([
      { contentRect: { width: 100, height: 100 } } as ResizeObserverEntry,
    ]);
    expect(onResize).toHaveBeenCalledTimes(1);
    expect(onResize).toHaveBeenLastCalledWith(100, 100);

    notifyResizeObserverChange([
      { contentRect: { width: 200, height: 200 } } as ResizeObserverEntry,
    ]);
    expect(onResize).toHaveBeenCalledTimes(2);
    expect(onResize).toHaveBeenLastCalledWith(200, 200);
  });

  it("should have a min-width of 0 when no minWidth is set", () => {
    const onResize = vi.fn();

    const { container } = render(() => (
      <ResponsiveContainer width="100%" height={200} onResize={onResize}>
        <DimensionSpy />
      </ResponsiveContainer>
    ));

    const element = container.querySelector(".recharts-responsive-container");

    expect(element).toHaveStyle({ width: "100%", height: "200px", "min-width": "0" });
  });

  it("should accept and render the style prop if it is set", () => {
    const { container } = render(() => (
      <ResponsiveContainer
        style={{ color: "red", "background-color": "#FF00FF" }}
        data-testid="container"
      >
        <DimensionSpy />
      </ResponsiveContainer>
    ));
    const responsiveContainer = container.getElementsByClassName("recharts-responsive-container");
    expect(responsiveContainer).toHaveLength(1);
    expect(responsiveContainer[0]).toHaveStyle("background-color: rgb(255, 0, 255)");
    expect(responsiveContainer[0]).toHaveStyle("color: rgb(255,0,0)");
  });

  it("should accept and render the style prop and any other specified outside of it", () => {
    const { container } = render(() => (
      <ResponsiveContainer
        style={{ "background-color": "red", color: "red" }}
        width="100%"
        height={100}
      >
        <DimensionSpy />
      </ResponsiveContainer>
    ));

    expect(container.querySelector(".recharts-responsive-container")).toHaveStyle({
      width: "100%",
      height: "100px",
      "background-color": "rgb(255,0,0)",
      color: "rgb(255,0,0)",
    });
  });

  it("should have a min-width of 200px when minWidth is 200", () => {
    const onResize = vi.fn();

    const { container } = render(() => (
      <ResponsiveContainer width="100%" height={200} minWidth={200} onResize={onResize}>
        <DimensionSpy />
      </ResponsiveContainer>
    ));

    const element = container.querySelector(".recharts-responsive-container");

    expect(element).toHaveStyle({ width: "100%", height: "200px", "min-width": "200px" });
  });

  it("should render multiple children, even when nested", () => {
    const onResize = vi.fn();

    mockGetBoundingClientRect({ height: 200, width: 400 });

    const { container } = render(() => (
      <ResponsiveContainer width="100%" height={200} minWidth={200} onResize={onResize}>
        <div>
          <DimensionSpy backgroundColor="blue" />
          <DimensionSpy />
          <DimensionSpy />
          <DimensionSpy />
        </div>
      </ResponsiveContainer>
    ));

    const responsiveContainerDiv = container.querySelector(".recharts-responsive-container");
    expect(responsiveContainerDiv).toHaveStyle({
      width: "100%",
      height: "200px",
      "min-width": "200px",
    });

    const elementsInside = screen.getAllByTestId("inside");
    expect(elementsInside).toHaveLength(4);

    const expectedStyle = {
      width: "400px",
      height: "200px",
    };

    expect(elementsInside[0]).toHaveStyle({
      ...expectedStyle,
      "background-color": "rgb(0, 0, 255)",
    });

    expect(elementsInside[1]).toHaveStyle(expectedStyle);
    expect(elementsInside[2]).toHaveStyle(expectedStyle);
    expect(elementsInside[3]).toHaveStyle(expectedStyle);
  });

  it("should not re-create ResizeObserver when onResize function instance changes", () => {
    const onResize1 = vi.fn();
    const onResize2 = vi.fn();
    const [onResize, setOnResize] = createSignal({ fn: onResize1 });
    render(() => (
      <ResponsiveContainer onResize={(width, height) => onResize().fn(width, height)}>
        <div />
      </ResponsiveContainer>
    ));

    const initialObserverInstance = resizeObserverMock.mock.results[0]?.value;
    expect(initialObserverInstance.disconnect).not.toHaveBeenCalled();
    expect(resizeObserverMock).toHaveBeenCalledTimes(1);

    setOnResize({ fn: onResize2 });
    expect(initialObserverInstance.disconnect).not.toHaveBeenCalled();
    expect(resizeObserverMock).toHaveBeenCalledTimes(1);

    notifyResizeObserverChange([
      { contentRect: { width: 100, height: 100 } } as ResizeObserverEntry,
    ]);
    expect(onResize1).not.toHaveBeenCalled();
    expect(onResize2).toHaveBeenCalledTimes(1);
    expect(onResize2).toHaveBeenCalledWith(100, 100);
  });

  it("should render children straight, without any detector divs, when width and height are both fixed numbers", () => {
    const { container } = render(() => (
      <ResponsiveContainer width={100} height={100}>
        <DimensionSpy />
      </ResponsiveContainer>
    ));
    expect(container.querySelector(".recharts-responsive-container")).not.toBeInTheDocument();
    expect(screen.getByTestId("inside")).toHaveStyle({ width: "100px", height: "100px" });
  });

  it("should not warn on initial render before dimensions are measured", () => {
    mockGetBoundingClientRect({ width: 400, height: 200 });

    render(() => (
      <ResponsiveContainer width="100%" height="100%">
        <DimensionSpy />
      </ResponsiveContainer>
    ));

    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it("should warn when aspect is not greater than zero", () => {
    render(() => (
      <ResponsiveContainer aspect={-1} width="100%" height={100}>
        <div />
      </ResponsiveContainer>
    ));
    expect(consoleWarnSpy).toHaveBeenCalledWith("The aspect(-1) must be greater than zero.");
  });

  it("should respect maxHeight when aspect ratio is used", () => {
    render(() => (
      <ResponsiveContainer aspect={2} width={400} maxHeight={150}>
        <DimensionSpy />
      </ResponsiveContainer>
    ));

    expect(screen.getByTestId("inside")).toHaveStyle({ width: "400px", height: "150px" });
  });

  it("should not re-render child if container size has not changed", () => {
    const childRenderSpy = vi.fn();
    function Child(): null {
      const size = useResponsiveContainerContext();
      createEffect(() => {
        const value = (() => ({ width: size?.width, height: size?.height }))();
        (({ width, height }) => {
          childRenderSpy(width, height);
        })(value);
      });
      return null;
    }
    render(() => (
      <ResponsiveContainer>
        <Child />
      </ResponsiveContainer>
    ));
    notifyResizeObserverChange([{ contentRect: { width: 10, height: 10 } } as ResizeObserverEntry]);
    expect(childRenderSpy).toHaveBeenCalledTimes(1);
    expect(childRenderSpy).toHaveBeenLastCalledWith(10, 10);
    childRenderSpy.mockClear();

    notifyResizeObserverChange([
      { contentRect: { width: 100, height: 100 } } as ResizeObserverEntry,
    ]);
    expect(childRenderSpy).toHaveBeenCalledTimes(1);
    childRenderSpy.mockClear();

    notifyResizeObserverChange([
      { contentRect: { width: 100, height: 100 } } as ResizeObserverEntry,
    ]);
    expect(childRenderSpy).not.toHaveBeenCalled();

    notifyResizeObserverChange([
      { contentRect: { width: 100.4, height: 100.4 } } as ResizeObserverEntry,
    ]);
    expect(childRenderSpy).not.toHaveBeenCalled();

    notifyResizeObserverChange([
      { contentRect: { width: 101, height: 101 } } as ResizeObserverEntry,
    ]);
    expect(childRenderSpy).toHaveBeenCalledTimes(1);
  });

  it("should expose container div via ref", () => {
    let ref: HTMLDivElement | undefined;
    render(() => (
      <ResponsiveContainer ref={(el) => (ref = el)}>
        <div />
      </ResponsiveContainer>
    ));

    expect(ref).toBeInstanceOf(HTMLDivElement);
    expect(ref?.classList.contains("recharts-responsive-container")).toBe(true);
  });

  it("Renders with id attribute when passed as a number", () => {
    const { container } = render(() => (
      <ResponsiveContainer id={123}>
        <DimensionSpy />
      </ResponsiveContainer>
    ));

    expect(container.querySelector(".recharts-responsive-container")).toHaveAttribute("id", "123");
  });

  it("Renders with minHeight and minWidth as percentages when provided", () => {
    const { container } = render(() => (
      <ResponsiveContainer minWidth="50%" minHeight="50%">
        <DimensionSpy />
      </ResponsiveContainer>
    ));

    expect(container.querySelector(".recharts-responsive-container")).toHaveStyle({
      minWidth: "50%",
      minHeight: "50%",
    });
  });

  it("should render with custom className", () => {
    const { container } = render(() => (
      <ResponsiveContainer class="my-custom-class">
        <div />
      </ResponsiveContainer>
    ));
    expect(container.querySelector(".recharts-responsive-container")).toHaveClass(
      "my-custom-class",
    );
  });
});
