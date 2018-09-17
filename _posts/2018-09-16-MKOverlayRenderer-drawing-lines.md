---
layout: post
title: MKOverlayRenderer - Drawing Lines
date: 2018-09-16
tags: MKMapView, MapKit, MKOverlayRenderer, custom, lines, drawing, not, rendering
---

Today, I spent roughly 5 hours, off and on, trying to figure out why the following custom MKOverlayRenderer wasn't rendering a line:

```swift
final class MyOverlay: NSObject, MKOverlay {
    var startCoordinate: CLLocationCoordinate2D
    var endCoordinate: CLLocationCoordinate2D

    init(start: CLLocationCoordinate2D, end: CLLocationCoordinate2D) {
        self.startCoordinate = start
        self.endCoordinate = end
        super.init()
    }
}

final class MyOverlayRenderer: MKOverlayRenderer {
    var strokeColor: Color = .clear
    var lineWidth: CGFloat = 2

    var myOverlay: MyOverlay { return self.overlay as! MyOverlay }

    override func draw(_ mapRect: MKMapRect, zoomScale: MKZoomScale, in context: CGContext) {
        guard self.startPoint != CGPoint.zero && self.endPoint != CGPoint.zero else {
            return
        }
        context.saveGState()

        let path = CGMutablePath()
        path.addLines(between: [self.startPoint, self.endPoint])

        context.setStrokeColor(self.strokeColor.cgColor)
        context.setLineWidth(self.lineWidth)

        context.addPath(path)
        context.drawPath(using: .stroke)

        context.restoreGState()
    }

    private var startPoint: CGPoint { return self.point(for: MKMapPoint(self.myOverlay.startCoordinate)) }
    private var endPoint: CGPoint { return self.point(for: MKMapPoint(self.myOverlay.endCoordinate)) }
}
```

Which was rendering as below (circles are where the two ends of the line segments should be):

![](/assets/mkoverlayrenderer/no_line.png)

I spent hours trying to figure out why these two points weren't rendering.

Eventually, looking through the docs, I noticed the [`MKRoadWidthAtZoomScale(_:)`](https://developer.apple.com/documentation/mapkit/1452156-mkroadwidthatzoomscale) function, and wondered if I should use that as a scaling factor for my line.

So, I did that. I changed the `setLineWidth` line to be: `context.setLineWidth(MKRoadWidthAtZoomScale(zoomScale) * max(self.lineWidth, 1))`, and ran it.

Behold, it works:

![](/assets/mkoverlayrenderer/shows_line.png)

But, hey, in the future. If you're looking at MKMapView, with a custom MKOverlayRenderer, and are trying to draw line segments, remember: MULTIPLY YOUR LINE WIDTH BY [`MKRoadWidthAtZoomScale(_:)`](https://developer.apple.com/documentation/mapkit/1452156-mkroadwidthatzoomscale).

For reference, the full code is below:

```swift
final class MyOverlay: NSObject, MKOverlay {
    var startCoordinate: CLLocationCoordinate2D
    var endCoordinate: CLLocationCoordinate2D

    init(start: CLLocationCoordinate2D, end: CLLocationCoordinate2D) {
        self.startCoordinate = start
        self.endCoordinate = end
        super.init()
    }
}

final class MyOverlayRenderer: MKOverlayRenderer {
    var strokeColor: Color = .clear
    var lineWidth: CGFloat = 2

    var myOverlay: MyOverlay { return self.overlay as! MyOverlay }

    override func draw(_ mapRect: MKMapRect, zoomScale: MKZoomScale, in context: CGContext) {
        guard self.startPoint != CGPoint.zero && self.endPoint != CGPoint.zero else {
            return
        }
        context.saveGState()

        let path = CGMutablePath()
        path.addLines(between: [self.startPoint, self.endPoint])

        context.setStrokeColor(self.strokeColor.cgColor)
        let width = MKRoadWidthAtZoomScale(zoomScale) * max(1, self.lineWidth)
        context.setLineWidth(width)

        context.addPath(path)
        context.drawPath(using: .stroke)

        context.restoreGState()
    }

    private var startPoint: CGPoint { return self.point(for: MKMapPoint(self.myOverlay.startCoordinate)) }
    private var endPoint: CGPoint { return self.point(for: MKMapPoint(self.myOverlay.endCoordinate)) }
}
```