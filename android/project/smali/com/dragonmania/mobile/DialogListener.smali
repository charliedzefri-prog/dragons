.class public Lcom/dragonmania/mobile/DialogListener;
.super Ljava/lang/Object;
.source "DialogListener.java"

# Кнопка OK → JsResult.confirm(), любая другая → JsResult.cancel().

.implements Landroid/content/DialogInterface$OnClickListener;


# instance fields
.field private final result:Landroid/webkit/JsResult;


# direct methods
.method public constructor <init>(Landroid/webkit/JsResult;)V
    .locals 0
    .param p1, "result"    # Landroid/webkit/JsResult;

    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    iput-object p1, p0, Lcom/dragonmania/mobile/DialogListener;->result:Landroid/webkit/JsResult;

    return-void
.end method


# virtual methods
.method public onClick(Landroid/content/DialogInterface;I)V
    .locals 2
    .param p1, "dialog"    # Landroid/content/DialogInterface;
    .param p2, "which"     # I

    iget-object v0, p0, Lcom/dragonmania/mobile/DialogListener;->result:Landroid/webkit/JsResult;

    const/4 v1, -0x1

    if-ne p2, v1, :cancel

    invoke-virtual {v0}, Landroid/webkit/JsResult;->confirm()V

    return-void

    :cancel
    invoke-virtual {v0}, Landroid/webkit/JsResult;->cancel()V

    return-void
.end method
